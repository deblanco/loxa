import {
  HAIR_COLORS,
  HAIR_STYLES,
  DEFAULT_COLOR_ID,
  DEFAULT_STYLE_ID,
  PREVIEW_SLOTS,
  catalogueResponseSchema,
  heroKey,
  tileKey,
  type CatalogueResponse,
} from '@loxa/shared';

/**
 * The published catalogue, read from the assets bucket.
 *
 * The manifest is written by `tools/generate-previews` next to the art it
 * describes, so the thing that knows which pictures exist is the thing that
 * made them. This Worker only reads it, validates it, and hands it to the app.
 *
 * **`catalogue.json` is the one mutable object in that bucket.** Every other
 * key is written once and cached for a year, which is what lets the app trust a
 * preview URL forever. This one is overwritten deliberately — that is the whole
 * feature — so it is uploaded with a short `cache-control` and this Worker
 * re-reads it rather than holding it in a module.
 */
export const CATALOGUE_KEY = 'catalogue.json';

/**
 * The catalogue as it ships, for when the bucket has nothing to say.
 *
 * Derived from the compiled catalogue, with every style, every colour and every
 * key that *would* exist for a finished run. It is deliberately optimistic: a
 * key here may well 404, and the app draws the hatch when it does, which is a
 * state it is already built for.
 *
 * This exists so that a fresh deploy against an empty bucket still answers, and
 * so that a corrupt upload degrades to "the catalogue we shipped" instead of to
 * an app with no catalogue at all. It is the same posture as an unset
 * `EXPO_PUBLIC_ASSETS_URL`: reduced, not broken.
 */
export function shippedCatalogue(): CatalogueResponse {
  return {
    version: 1,
    styles: HAIR_STYLES.map((style) => ({
      id: style.id,
      name: style.name,
      tiles: PREVIEW_SLOTS.map((slot) => tileKey(style.id, slot)),
      colors: HAIR_COLORS.map((color) => ({
        id: color.id,
        heroes: PREVIEW_SLOTS.map((slot) => heroKey(style.id, color.id, slot)),
      })),
    })),
    colors: HAIR_COLORS.map((color) => ({ id: color.id, name: color.name, hex: color.hex })),
    defaults: { styleId: DEFAULT_STYLE_ID, colorId: DEFAULT_COLOR_ID },
  };
}

export interface CatalogueRead {
  catalogue: CatalogueResponse;
  /**
   * The R2 object's etag, when the answer came from one.
   *
   * Absent for the fallback: an etag is a promise that the same string means
   * the same bytes, and the fallback's bytes change with every deploy.
   */
  etag?: string;
}

/**
 * Read and validate the manifest, falling back to the shipped catalogue.
 *
 * A missing object is normal — the bucket may not have been uploaded to yet.
 * A malformed one is not, and is logged, but it is still not worth a 500: the
 * app in the user's hand cannot fix our upload, and the shipped catalogue is a
 * usable answer. Both paths return something the app can draw.
 */
export async function readCatalogue(bucket: R2Bucket): Promise<CatalogueRead> {
  let object: R2ObjectBody | null;
  try {
    object = await bucket.get(CATALOGUE_KEY);
  } catch (err) {
    console.error('catalogue: bucket unreachable', err);
    return { catalogue: shippedCatalogue() };
  }

  if (!object) return { catalogue: shippedCatalogue() };

  let body: unknown;
  try {
    body = await object.json();
  } catch (err) {
    console.error('catalogue: not JSON', err);
    return { catalogue: shippedCatalogue() };
  }

  const parsed = catalogueResponseSchema.safeParse(body);
  if (!parsed.success) {
    console.error('catalogue: malformed manifest', parsed.error.issues);
    return { catalogue: shippedCatalogue() };
  }

  return { catalogue: parsed.data, etag: object.httpEtag };
}
