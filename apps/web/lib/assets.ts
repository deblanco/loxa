/**
 * Where the catalogue art is served from — the web mirror of
 * `apps/mobile/src/api/assets.ts`.
 *
 * The keys come from `@loxa/shared`, which knows the layout of the bucket but
 * not where the bucket lives. The pictures are public, immutable and served
 * straight off the assets domain rather than through this Worker: they need no
 * request of ours, and proxying them would only add one.
 */
const BASE = process.env.NEXT_PUBLIC_ASSETS_URL ?? "";

/**
 * `undefined` rather than a broken URL when the host is unset.
 *
 * Callers draw the hatched placeholder for a missing URL, so a build without
 * the variable falls back to exactly the page the site shipped with — labelled
 * placeholders, which the design system already treats as a legitimate state,
 * instead of a grid of broken images.
 */
export function assetUrl(key: string): string | undefined {
  if (!BASE) return undefined;
  return `${BASE.replace(/\/+$/, "")}/${key}`;
}
