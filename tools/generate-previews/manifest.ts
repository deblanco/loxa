/**
 * The manifest, built from the pictures that actually exist.
 *
 *   bun run tools/generate-previews/manifest.ts            # print it
 *   bun run tools/generate-previews/manifest.ts --write    # and write catalogue.json
 *
 * The app draws whatever this file says, so this is the thing that decides what
 * is in the catalogue — not `HAIR_STYLES`, which is the superset the Worker
 * holds prompts for. A cut is published when its art is on disk and this has
 * been re-run, which is why adding one is an upload rather than a release.
 *
 * It reads the same tree `upload.sh` uploads, so the two cannot disagree about
 * what is there: both look at the files.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_COLOR_ID,
  DEFAULT_STYLE_ID,
  HAIR_COLORS,
  HAIR_STYLES,
  PREVIEW_SLOTS,
  catalogueResponseSchema,
  heroKey,
  tileKey,
  type CatalogueResponse,
  type CatalogueStyle,
} from '@loxa/shared';

const OUT_DIR = join(import.meta.dir, 'catalogue');

/** The manifest's own key in the bucket, and the file name on disk. */
export const CATALOGUE_FILE = 'catalogue.json';

function exists(key: string): boolean {
  return existsSync(join(OUT_DIR, key));
}

export function buildManifest(): CatalogueResponse {
  const styles: CatalogueStyle[] = [];

  for (const style of HAIR_STYLES) {
    const colors = HAIR_COLORS.flatMap((color) => {
      const heroes = PREVIEW_SLOTS.map((slot) => heroKey(style.id, color.id, slot)).filter(exists);
      // One rendered model is enough to show the pair; the plate pages through
      // whatever is there. Zero is not a colour, it is an absence.
      return heroes.length > 0 ? [{ id: color.id, heroes }] : [];
    });

    // A style with no colour rendered has nothing to show behind the plate, and
    // a strip tile that leads to an empty screen is worse than no tile.
    if (colors.length === 0) continue;

    styles.push({
      id: style.id,
      name: style.name,
      // Usually empty, and that is fine: 45 of the 48 tiles have never been
      // rendered. The strip falls back to a hero rather than dropping the cut.
      tiles: PREVIEW_SLOTS.map((slot) => tileKey(style.id, slot)).filter(exists),
      colors,
    });
  }

  if (styles.length === 0) {
    throw new Error(`no rendered styles under ${OUT_DIR} — run the generator first`);
  }

  // Only the colours some style actually uses. A swatch nobody can select is a
  // colour strip that lies about what the catalogue holds.
  const published = new Set(styles.flatMap((style) => style.colors.map((color) => color.id)));
  const colors = HAIR_COLORS.filter((color) => published.has(color.id)).map((color) => ({
    id: color.id,
    name: color.name,
    hex: color.hex,
  }));

  // The shipped defaults where they survived the filter, and the first
  // published entry where they did not. The screen has to open on something,
  // and it must be something that exists.
  const defaultStyle = styles.find((style) => style.id === DEFAULT_STYLE_ID) ?? styles[0]!;
  const defaultColor =
    defaultStyle.colors.find((color) => color.id === DEFAULT_COLOR_ID) ?? defaultStyle.colors[0]!;

  const manifest: CatalogueResponse = {
    version: 1,
    styles,
    colors,
    defaults: { styleId: defaultStyle.id, colorId: defaultColor.id },
  };

  // Parsed with the same schema the Worker and the app use, here rather than
  // after an upload: a manifest that fails validation in the bucket is a
  // catalogue outage, and this is the last place it is free to catch.
  return catalogueResponseSchema.parse(manifest);
}

if (import.meta.main) {
  const manifest = buildManifest();
  const heroes = manifest.styles.reduce(
    (total, style) => total + style.colors.reduce((n, color) => n + color.heroes.length, 0),
    0,
  );
  const tiles = manifest.styles.reduce((total, style) => total + style.tiles.length, 0);

  console.error(
    `${manifest.styles.length}/${HAIR_STYLES.length} styles, ` +
      `${manifest.colors.length}/${HAIR_COLORS.length} colours, ` +
      `${heroes} heroes, ${tiles} tiles, ` +
      `opening on ${manifest.defaults.styleId}/${manifest.defaults.colorId}`,
  );

  if (process.argv.includes('--write')) {
    const path = join(OUT_DIR, CATALOGUE_FILE);
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
    console.error(`wrote ${path}`);
  } else {
    console.log(JSON.stringify(manifest, null, 2));
  }
}
