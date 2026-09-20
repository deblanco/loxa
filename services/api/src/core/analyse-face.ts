import { HAIR_STYLES, HAIR_STYLE_IDS, type FaceShape } from '@loxa/shared';
import type { AnalysisCachePort } from '../ports/analysis-cache';
import type { CreditLedgerPort } from '../ports/credit-ledger';
import type { EntitlementsPort } from '../ports/entitlements';
import type { FaceAnalystPort } from '../ports/face-analyst';
import type { ReportQuotaPort } from '../ports/report-quota';
import { analysisCacheKey } from './cache-key';
import { AnalysisQuotaError, OutOfCreditsError } from './errors';
import { available } from './rules';
import { MAX_CUTS, validateSuitability, type Suitability } from './suitability';

export interface AnalyseFaceDeps {
  ledger: CreditLedgerPort;
  entitlements: EntitlementsPort;
  analyst: FaceAnalystPort;
  cache: AnalysisCachePort;
  quota: ReportQuotaPort;
  now: () => Date;
}

export interface AnalyseFaceCommand {
  deviceId: string;
  photosBase64: readonly string[];
}

export interface AnalyseFaceResult extends Suitability {
  creditsLeft: number;
  cached: boolean;
}

/**
 * How many analyses one device may ask for in a day.
 *
 * This route spends no credit, so this number is the only ceiling on what it
 * can cost us. Twenty is far past what anyone deciding on a haircut will use
 * and far below what a script could run up before anybody noticed.
 */
export const DAILY_ANALYSIS_LIMIT = 20;

/**
 * Read a face, and name the cuts that suit it.
 *
 * **This use case never writes the ledger.** It is the only metered-looking
 * route that does not: a balance is required, and nothing is taken from it.
 * That is why there is no refund path here and why a provider failing cannot
 * cost anybody anything — there is no spend to undo.
 *
 * The order is the same shape as `try-on.ts`, for the same reasons:
 *
 * 1. **Cache first, before the balance gate.** A hit is not a model call, so
 *    it is not what the gate exists to stop. Somebody who has spent their last
 *    credit can still re-open the answer they already have.
 * 2. **The balance gate.** Having a credit is what buys the feature; keeping it
 *    is what makes the feature worth having.
 * 3. **The daily quota**, after the gate: a user with no credits should meet
 *    the paywall, not a rate limit they cannot do anything about.
 * 4. **Ask, then check what came back.** `validateSuitability` is what decides
 *    whether an answer is one we are willing to show.
 *
 * It deliberately does **not** touch `UsageStatsPort`. That tally counts cuts
 * people chose, and it decides which art gets rendered next; feeding six
 * suggestions into it per analysis would inflate whatever the model likes and
 * corrupt the one signal we have. The privacy policy's "what we count"
 * paragraph is true only while this stays absent.
 */
export async function analyseFace(
  command: AnalyseFaceCommand,
  deps: AnalyseFaceDeps,
): Promise<AnalyseFaceResult> {
  const now = deps.now();
  const key = await analysisCacheKey(command.photosBase64, HAIR_STYLE_IDS);

  const [cached, plan, state] = await Promise.all([
    deps.cache.get(key),
    deps.entitlements.planFor(command.deviceId),
    deps.ledger.read(command.deviceId),
  ]);

  const creditsLeft = available(state, plan, now);

  if (cached) {
    const answer = readCached(cached);
    if (answer) return { ...answer, creditsLeft, cached: true };
    // A cached value that no longer parses is a cache miss, not a failure: the
    // shape of what we store here changes with the feature.
  }

  if (creditsLeft <= 0) throw new OutOfCreditsError();

  const granted = await deps.quota.consume(command.deviceId, 1, DAILY_ANALYSIS_LIMIT, now);
  if (granted === 0) throw new AnalysisQuotaError();

  const draft = await deps.analyst.analyse({
    photosBase64: command.photosBase64,
    // Ids and names, never prompts: what the model is told about our catalogue
    // is what the app is told about it.
    catalogue: HAIR_STYLES.map((style) => ({ id: style.id, name: style.name })),
    limit: MAX_CUTS,
  });

  const answer = validateSuitability(draft, new Set(HAIR_STYLE_IDS));
  await deps.cache.put(key, JSON.stringify(answer));

  return { ...answer, creditsLeft, cached: false };
}

/** What is in the cache, if it is still the shape this build writes. */
function readCached(raw: string): Suitability | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const { faceShape, cuts } = parsed as { faceShape?: unknown; cuts?: unknown };
    if (typeof faceShape !== 'string' || !Array.isArray(cuts) || cuts.length === 0) return null;

    return { faceShape: faceShape as FaceShape, cuts: cuts as Suitability['cuts'] };
  } catch {
    return null;
  }
}
