/**
 * The base photographs, small enough to serve.
 *
 * Every other object in the bucket is a render; these are what the renders
 * were made *from*, which is the only "before" the catalogue can show. They
 * are 4MB PNGs in `design-system/models/` — far too large to hand a phone — so
 * they are resized once, here, to the width a plate's inset actually draws.
 *
 *   bun run tools/generate-previews/models.ts
 *
 * Writes into the same `catalogue/` tree the images go to, so `upload.sh`
 * pushes them with everything else and the keys match `modelKey`.
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const MODELS_DIR = join(import.meta.dir, '../../design-system/models');
const OUT_DIR = join(import.meta.dir, 'catalogue/models');

/**
 * 720px on the long edge.
 *
 * The largest any screen draws one is the welcome reel's inset at a third of a
 * phone, and a before that costs more to fetch than the render beside it would
 * be a strange trade.
 */
const MAX_EDGE = 720;
const QUALITY = 82;

if (!existsSync(MODELS_DIR)) {
  throw new Error(
    `missing ${MODELS_DIR}\ndesign-system/models/ is not in git — see its README for where the originals live.`,
  );
}

mkdirSync(OUT_DIR, { recursive: true });

const sources = readdirSync(MODELS_DIR).filter((name) => name.endsWith('.png'));
let written = 0;

for (const source of sources) {
  const name = source.replace(/\.png$/, '');
  const out = join(OUT_DIR, `${name}.jpg`);
  if (existsSync(out)) continue;

  await sharp(join(MODELS_DIR, source))
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: QUALITY })
    .toFile(out);
  written += 1;
}

console.log(`${written} written, ${sources.length - written} already there → ${OUT_DIR}`);
