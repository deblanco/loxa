/**
 * Where the catalogue art is served from.
 *
 * The keys come from the served manifest, which is the only thing that knows
 * what the bucket holds; where the bucket *lives* is this file's one job, and
 * deliberately not the manifest's. A host baked into a manifest would be frozen
 * into a 24h client cache, so moving the bucket would break every installed app
 * for a day with no way to push a correction. The pictures are
 * public, immutable and served straight off R2's own domain rather than through
 * the Worker: they need no credit check, no device id and no CPU, and putting
 * them behind the API would only add all three.
 */
const BASE = process.env.EXPO_PUBLIC_ASSETS_URL ?? '';

/**
 * `undefined` rather than a broken URL when the host is unset.
 *
 * `PhotoPlate` draws its hatched placeholder for a missing `uri`, so a build
 * without the variable falls back to exactly the empty state the app shipped
 * with — a labelled placeholder, which the design system already treats as a
 * legitimate state, instead of a grid of broken images.
 */
export function assetUrl(key: string | undefined): string | undefined {
  if (!BASE || !key) return undefined;
  return `${BASE.replace(/\/+$/, '')}/${key}`;
}
