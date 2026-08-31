import type { CatalogueColor, CatalogueResponse, CatalogueStyle } from '@loxa/shared';
import type { Selection } from './selection';

/**
 * Reading the served catalogue.
 *
 * The app used to import `HAIR_STYLES` and derive every preview key from an id.
 * It no longer knows the bucket's layout at all: the manifest hands it the keys
 * it should ask for, which is what lets a style carry nine colours instead of
 * ten, or a tile that was never rendered, without the app guessing and getting
 * a 404 for its trouble.
 *
 * All of it is pure, and separate from `store/catalogue.ts` for that reason —
 * the store touches AsyncStorage and React, and the rules worth testing should
 * not need either.
 */

export function findStyle(
  catalogue: CatalogueResponse,
  styleId: string,
): CatalogueStyle | undefined {
  return catalogue.styles.find((style) => style.id === styleId);
}

export function findColor(
  catalogue: CatalogueResponse,
  colorId: string,
): CatalogueColor | undefined {
  return catalogue.colors.find((color) => color.id === colorId);
}

/** The colours rendered for one style, in catalogue order, with their swatches. */
export function colorsFor(catalogue: CatalogueResponse, styleId: string): CatalogueColor[] {
  const style = findStyle(catalogue, styleId);
  if (!style) return [];

  return style.colors.flatMap((entry) => {
    const color = findColor(catalogue, entry.id);
    return color ? [color] : [];
  });
}

/** The full-frame previews behind the plate. Empty for a pair with no art. */
export function heroKeys(
  catalogue: CatalogueResponse,
  styleId: string,
  colorId: string,
): string[] {
  return findStyle(catalogue, styleId)?.colors.find((entry) => entry.id === colorId)?.heroes ?? [];
}

/**
 * The strip tile for one style, given the session's seed.
 *
 * Each cut was photographed on two models and the tile shows one of them, held
 * for the session so the catalogue looks different between launches without
 * anything moving on its own — the design system names four ambient loops and
 * says they are the only things on screen that move untouched.
 *
 * Falls back to a hero, because tiles are the least-finished part of the
 * catalogue: three of them exist. A style with art but no crop should still
 * show a photograph rather than a hatch.
 */
export function tileFor(
  catalogue: CatalogueResponse,
  styleId: string,
  seed: number,
): string | undefined {
  const style = findStyle(catalogue, styleId);
  if (!style) return undefined;
  if (style.tiles.length > 0) return style.tiles[seed % style.tiles.length];

  const fallback = style.colors[0]?.heroes ?? [];
  return fallback[seed % fallback.length];
}

/**
 * Pull a cut and colour back inside the catalogue.
 *
 * Three ways a pair can fall outside. A cached manifest can be older than the
 * one that just arrived, so a background refresh can withdraw the very cut the
 * user is looking at. Colours are per-style, so choosing a style that was never
 * rendered in the current colour would otherwise leave a named colour over an
 * empty plate. And the confirm screen's swipe walks to the neighbouring cut
 * while holding the colour, which is the same problem arriving from the other
 * direction — the cut two along may carry six colours where this one carries
 * ten.
 *
 * All three resolve the same way: keep what is still published, fall back to
 * the default, and never leave a screen naming something it cannot draw.
 *
 * Returns the same pair by identity when nothing moved, so a caller can use it
 * to decide whether there is anything to set.
 */
export function clampPair(
  catalogue: CatalogueResponse,
  styleId: string,
  colorId: string,
): { styleId: string; colorId: string } {
  const style = findStyle(catalogue, styleId) ?? findStyle(catalogue, catalogue.defaults.styleId);

  // The schema guarantees the default style is in the list, so this only
  // happens for a manifest that never passed it — which cannot be cached.
  if (!style) return { styleId, colorId };

  const resolved = style.colors.some((entry) => entry.id === colorId)
    ? colorId
    : (style.colors.find((entry) => entry.id === catalogue.defaults.colorId)?.id ??
      style.colors[0]!.id);

  return { styleId: style.id, colorId: resolved };
}

/**
 * The same rule, for the preview screen's whole selection.
 *
 * Returns the selection unchanged by identity when the pair was already inside
 * the catalogue, which is what lets the screen's clamping effect run on every
 * manifest without causing a render.
 */
export function clampSelection(
  selection: Selection,
  catalogue: CatalogueResponse,
): Selection {
  const { styleId, colorId } = clampPair(catalogue, selection.styleId, selection.colorId);

  if (styleId === selection.styleId && colorId === selection.colorId) return selection;
  return { ...selection, styleId, colorId };
}

/**
 * The cut before or after this one in the strip, if there is one.
 *
 * The plate's pager runs off its edges into the neighbouring styles, so a user
 * who never looks down at the strip can still walk the whole catalogue. It does
 * not wrap: the ends of the strip are the ends of the pager too, and a swipe
 * that silently jumped from the last cut to the first would lose them.
 */
export function adjacentStyle(
  catalogue: CatalogueResponse,
  styleId: string,
  step: 1 | -1,
): CatalogueStyle | undefined {
  const index = catalogue.styles.findIndex((style) => style.id === styleId);
  if (index < 0) return undefined;
  return catalogue.styles[index + step];
}
