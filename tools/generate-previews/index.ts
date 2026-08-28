/**
 * The catalogue art, generated once.
 *
 * Run by hand, never in CI: it spends real money against the Loxa Vertex
 * project and writes files that are then uploaded to R2 and left alone. The
 * app never calls this — it only ever reads the finished pictures.
 *
 *   bun run tools/generate-previews/index.ts --dry-run
 *   bun run tools/generate-previews/index.ts --style=blunt-bob --limit=2
 *   bun run tools/generate-previews/index.ts
 *
 * It is resumable, and that is the whole reason it writes to disk before it
 * uploads: a run that dies at image 300 must not re-bill the first 299.
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import {
  DEFAULT_COLOR_ID,
  HAIR_COLORS,
  HAIR_STYLES,
  PREVIEW_SLOTS,
  heroKey,
  tileKey,
  type HairColor,
  type HairStyle,
  type PreviewSlot,
} from '@loxa/shared';
import {
  accessToken,
  parseServiceAccountKey,
  type ServiceAccountCredentials,
} from '../../services/api/src/adapters/vertex/auth';
import { buildPreviewPrompt } from './prompt';

const ROOT = join(import.meta.dir, '../..');
const MODELS_DIR = join(ROOT, 'design-system/models');
/**
 * The finished pictures, and they are committed.
 *
 * Image generation is not deterministic: re-running this script does not
 * reproduce these photographs, it produces different ones. Regenerating the
 * catalogue costs money, the better part of a day against the Vertex quota, and
 * leaves the app looking subtly unlike the build that was reviewed. So the
 * output is source, not a build artifact, and it lives in git.
 *
 * `.cache/` is the opposite — the downscaled bases, the log and the failure
 * list are all cheap to rebuild, so they stay out.
 */
const OUT_DIR = join(import.meta.dir, 'catalogue');
const CACHE_DIR = join(import.meta.dir, '.cache');
const BASE_DIR = join(CACHE_DIR, 'bases');

/** The one place the project id and the model are named. `global`, like the Worker, for the same price reason. */
const PROJECT_ID = 'loxa-506814';
const LOCATION = 'global';

/**
 * Nano Banana 2 proper, not the Flash-**Lite** the Worker runs on.
 *
 * This is a one-off batch of 480 pictures that will sit in the catalogue for
 * months, so it is worth more per image than a render a user waits on. Verified
 * reachable on this project before the run.
 */
const MODEL = 'gemini-3.1-flash-image';

/** The plate is 9:16 and so is every picture that lands in it. */
const ASPECT_RATIO = '9:16';
const OUT_WIDTH = 1080;
const OUT_HEIGHT = 1920;

/**
 * The tile, at 70 × 84 points on a 3× screen. Cropped from the render rather
 * than generated separately: a second call would cost as much as the first and
 * would not agree with it.
 */
const TILE_WIDTH = 210;
const TILE_HEIGHT = 252;

/**
 * `--placeholder` from the design system, which is what the prompt asks the
 * backdrop to be. Anything further than the tolerance means the model ignored
 * the instruction and the picture will not sit flush in the plate.
 */
const BACKDROP = { r: 0xe7, g: 0xe1, b: 0xd8 };
const BACKDROP_TOLERANCE = 22;

/** Long edge the base photograph is sent at, matching `apps/mobile/src/photo.ts`. */
const BASE_MAX_EDGE = 1024;

/**
 * Two at a time, which is generous for what the project actually allows.
 *
 * Measured rather than guessed, and measured twice because the first reading
 * was wrong. A cold burst of six concurrent calls returns three 200s, which
 * looks like a concurrency limit; but run back-to-back for three minutes with
 * nothing else competing, this project renders exactly three pictures. The
 * burst is a bucket refilling, not headroom.
 *
 * So the real ceiling is about **one image per minute**, and it is the same for
 * the Lite and Pro models — it belongs to the project, not to the model. No
 * amount of concurrency moves it, and the model is published on `global` only,
 * so there is no region to escape to. A full 480-picture run therefore takes
 * the best part of eight hours unless the Vertex quota is raised in the console.
 *
 * Two workers, then: enough to use the bucket the moment it refills, few enough
 * not to spend the run generating 429s.
 */
const DEFAULT_CONCURRENCY = 2;

/** Ordinary failures: a couple of quick retries and move on. */
const MAX_ATTEMPTS = 3;

/**
 * A 429 is a full doorway, not a failure, so it does not count against
 * MAX_ATTEMPTS. Someone else's render is about to finish; wait a beat and walk
 * back in.
 *
 * The tolerance is deliberately long — fifteen minutes of knocking. Sustained
 * throughput measures at roughly a picture a minute, so under a full batch a
 * worker genuinely waits minutes for its turn, and giving up early just means a
 * hole in the catalogue and another run to fill it.
 */
const MAX_QUOTA_WAITS = 60;
const QUOTA_WAIT_MS = 15_000;

interface Job {
  style: HairStyle;
  color: HairColor;
  slot: PreviewSlot;
  modelFile: string;
  key: string;
}

interface Flags {
  dryRun: boolean;
  style?: string;
  colour?: string;
  limit?: number;
  concurrency: number;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { dryRun: false, concurrency: DEFAULT_CONCURRENCY };
  for (const arg of argv) {
    if (arg === '--dry-run') flags.dryRun = true;
    else if (arg.startsWith('--style=')) flags.style = arg.slice(8);
    else if (arg.startsWith('--colour=')) flags.colour = arg.slice(9);
    else if (arg.startsWith('--color=')) flags.colour = arg.slice(8);
    else if (arg.startsWith('--limit=')) flags.limit = Number(arg.slice(8));
    else if (arg.startsWith('--concurrency=')) flags.concurrency = Number(arg.slice(14));
    else throw new Error(`unknown flag: ${arg}`);
  }
  return flags;
}

function loadRoster(): Record<string, [string, string]> {
  const raw = JSON.parse(readFileSync(join(import.meta.dir, 'roster.json'), 'utf8'));
  return raw.styles as Record<string, [string, string]>;
}

/**
 * The base photograph, downscaled once and reused for every one of the 240
 * renders it appears in. Sending the 4 MB original 240 times would be billed
 * 240 times for detail the model does not use.
 */
async function baseImage(modelFile: string): Promise<string> {
  const cached = join(BASE_DIR, `${modelFile}.jpg`);
  if (!existsSync(cached)) {
    const source = join(MODELS_DIR, `${modelFile}.png`);
    if (!existsSync(source)) {
      throw new Error(
        `missing base photograph ${source}\n` +
          'design-system/models/ is not in git - see its README for where the originals live.',
      );
    }
    mkdirSync(BASE_DIR, { recursive: true });
    await sharp(source)
      .resize({ width: BASE_MAX_EDGE, height: BASE_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toFile(cached);
  }
  return readFileSync(cached).toString('base64');
}

/**
 * How far the backdrop sits from the one the prompt asked for.
 *
 * Sampled across the top band only. The bottom corners of a 9:16 bust are
 * shoulder, not backdrop — gating on those rejects a perfectly good picture for
 * having a person in it, which was the first thing this got wrong.
 */
async function backdropDrift(jpeg: Buffer): Promise<number> {
  const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const inset = Math.round(width * 0.02);

  const points: [number, number][] = [
    [inset, inset],
    [width - 1 - inset, inset],
    [Math.round(width / 2), inset],
    [inset, Math.round(height * 0.18)],
    [width - 1 - inset, Math.round(height * 0.18)],
  ];

  let worst = 0;
  for (const [x, y] of points) {
    const i = (y * width + x) * channels;
    worst = Math.max(
      worst,
      Math.abs(data[i] - BACKDROP.r),
      Math.abs(data[i + 1] - BACKDROP.g),
      Math.abs(data[i + 2] - BACKDROP.b),
    );
  }
  return worst;
}

interface QuotaError extends Error {
  quota?: true;
}

/**
 * An auth failure is not this job's problem, it is every job's problem.
 *
 * The first long run minted one token before the worker pool started and held
 * the string for the whole batch. Google's tokens live an hour; the run lived
 * seven. At sixty minutes every call began returning 401, and because a 401 is
 * not a 429 it fell through to the ordinary per-job retry — so the script spent
 * its remaining hours failing four hundred jobs three times each, silently,
 * looking exactly like a run that was merely slow.
 *
 * Refreshing the token fixed the cause. This flag fixes the symptom: a revoked
 * key, a clock skew or a lost token is true of the whole queue, so the run stops
 * and says so rather than grinding through it.
 */
interface FatalError extends Error {
  fatal?: true;
}

interface RenderOutcome {
  jpeg?: Buffer;
  outputTokens: number;
  /** Set when the model refused rather than failed. Logged and skipped, never retried. */
  refusal?: string;
}

async function render(job: Job, credentials: ServiceAccountCredentials): Promise<RenderOutcome> {
  const endpoint =
    `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}` +
    `/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

  const body64 = await baseImage(job.modelFile);

  // Per request, not per run. `accessToken` is a cache that re-mints on expiry,
  // so on the warm path this is a Map lookup — and the one-hour token boundary
  // that stalled the first full run simply stops existing.
  const token = await accessToken(credentials);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildPreviewPrompt(job.style, job.color) },
            { inlineData: { mimeType: 'image/jpeg', data: body64 } },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: ASPECT_RATIO },
      },
    }),
  });

  if (!response.ok) {
    const body = (await response.text()).slice(0, 200).replace(/\s+/g, ' ');
    const error = new Error(`${response.status}: ${body}`);
    if (response.status === 429) (error as QuotaError).quota = true;
    if (response.status === 401 || response.status === 403) (error as FatalError).fatal = true;
    throw error;
  }

  const body = (await response.json()) as {
    candidates?: {
      content?: { parts?: { inlineData?: { data?: string } }[] };
      finishReason?: string;
    }[];
    promptFeedback?: { blockReason?: string };
    usageMetadata?: { candidatesTokenCount?: number };
  };

  const outputTokens = body.usageMetadata?.candidatesTokenCount ?? 0;

  if (body.promptFeedback?.blockReason) {
    return { refusal: `blocked: ${body.promptFeedback.blockReason}`, outputTokens };
  }

  const candidate = body.candidates?.[0];
  const data = candidate?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData?.data;

  if (!data) {
    const reason = candidate?.finishReason ?? 'none';
    if (reason === 'SAFETY' || reason === 'IMAGE_SAFETY') {
      return { refusal: `refused: ${reason}`, outputTokens };
    }
    throw new Error(`no image (finishReason: ${reason})`);
  }

  return { jpeg: Buffer.from(data, 'base64'), outputTokens };
}

function write(key: string, body: Buffer): void {
  const path = join(OUT_DIR, key);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const roster = loadRoster();

  const styles = HAIR_STYLES.filter((s) => !flags.style || s.id === flags.style);
  const colours = HAIR_COLORS.filter((c) => !flags.colour || c.id === flags.colour);
  if (styles.length === 0) throw new Error(`no such style: ${flags.style}`);
  if (colours.length === 0) throw new Error(`no such colour: ${flags.colour}`);

  let jobs: Job[] = [];
  for (const style of styles) {
    const pair = roster[style.id];
    if (!pair) throw new Error(`${style.id} is missing from roster.json`);
    for (const color of colours) {
      for (const slot of PREVIEW_SLOTS) {
        jobs.push({
          style,
          color,
          slot,
          modelFile: pair[slot],
          key: heroKey(style.id, color.id, slot),
        });
      }
    }
  }

  const planned = jobs.length;
  jobs = jobs.filter((job) => !existsSync(join(OUT_DIR, job.key)));
  const skipped = planned - jobs.length;
  if (flags.limit !== undefined) jobs = jobs.slice(0, flags.limit);

  console.log(
    `${planned} planned · ${skipped} already on disk · ${jobs.length} to render · model ${MODEL}`,
  );

  if (flags.dryRun) {
    for (const job of jobs) console.log(`  ${job.key}  <- ${job.modelFile}`);
    console.log('\n--dry-run: nothing rendered, nothing billed.');
    return;
  }

  const credentials = parseServiceAccountKey(readFileSync(join(ROOT, 'secrets/loxa-cf.json'), 'utf8'));
  // Minted inside render(), once per request against a cache. Holding one here
  // for the whole run is what stalled the first attempt at exactly one hour.
  await accessToken(credentials);

  const failures: string[] = [];
  let fatal: string | undefined;
  let done = 0;
  let tokensSpent = 0;

  const queue = [...jobs];
  const workers = Array.from({ length: Math.min(flags.concurrency, queue.length) }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      let attempt = 0;
      let quotaWaits = 0;
      let lastError = '';

      while (attempt < MAX_ATTEMPTS) {
        try {
          const outcome = await render(job, credentials);
          tokensSpent += outcome.outputTokens;

          if (outcome.refusal) {
            const line = `${job.key} (${job.modelFile}) ${outcome.refusal}`;
            failures.push(line);
            console.log(`  refused  ${line}`);
            lastError = '';
            break;
          }

          const framed = await sharp(outcome.jpeg!)
            .resize(OUT_WIDTH, OUT_HEIGHT, { fit: 'cover', position: 'top' })
            .jpeg({ quality: 82, mozjpeg: true })
            .toBuffer();

          const drift = await backdropDrift(framed);
          attempt++;
          if (drift > BACKDROP_TOLERANCE && attempt < MAX_ATTEMPTS) {
            lastError = `backdrop drifted ${drift}`;
            continue;
          }

          write(job.key, framed);
          done++;
          lastError = '';
          if (drift > BACKDROP_TOLERANCE) {
            failures.push(`${job.key} kept with backdrop drift ${drift}`);
          }
          const note = drift > BACKDROP_TOLERANCE ? `  (drift ${drift})` : '';
          console.log(`  ${done}/${jobs.length}  ${job.key}${note}`);
          break;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);

          // True of every remaining job, so there is nothing to retry.
          if ((err as FatalError).fatal) {
            queue.length = 0;
            fatal = fatal ?? lastError;
            break;
          }

          // A queue, not a failure: wait for the window to refill and try the
          // same picture again without spending one of its attempts.
          if ((err as QuotaError).quota && quotaWaits < MAX_QUOTA_WAITS) {
            quotaWaits++;
            await new Promise((r) => setTimeout(r, QUOTA_WAIT_MS));
            continue;
          }

          attempt++;
          if (attempt < MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, 1500 * attempt));
          }
        }
      }

      if (lastError) {
        // Logged here rather than only in the summary: a run quietly failing
        // every job used to look identical to a run that was merely slow.
        const line = `${job.key} (${job.modelFile}) ${lastError}`;
        failures.push(line);
        console.log(`  FAILED  ${line}`);
      }
    }
  });

  await Promise.all(workers);

  // The tiles are crops of the default colour, so the strip is one set even
  // though it does not follow the colour selection.
  let tiles = 0;
  for (const style of styles) {
    for (const slot of PREVIEW_SLOTS) {
      const source = join(OUT_DIR, heroKey(style.id, DEFAULT_COLOR_ID, slot));
      if (!existsSync(source)) continue;
      const tile = await sharp(source)
        .resize(TILE_WIDTH, TILE_HEIGHT, { fit: 'cover', position: 'top' })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      write(tileKey(style.id, slot), tile);
      tiles++;
    }
  }

  const dollars = ((tokensSpent / 1000) * 0.03).toFixed(2);
  console.log(`\n${done} rendered · ${tiles} tiles · ${tokensSpent} output tokens (~$${dollars} at Lite's rate)`);

  if (failures.length) {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(join(CACHE_DIR, 'failures.txt'), failures.join('\n') + '\n');
    console.log(`${failures.length} failures, written to .cache/failures.txt`);
  }

  if (fatal) {
    // Non-zero, because a run that stopped early must not read as a run that
    // finished. Everything rendered is still on disk and the next run skips it.
    console.error(`\nstopped early: ${fatal}`);
    process.exit(1);
  }
}

await main();
