/**
 * Where the catalogue art lives.
 *
 * The strip and the preview plate both show generated photographs rather than
 * the hatched placeholder, and there are far too many of them to name by hand:
 * every style carries a tile, and every style-and-colour pair carries one
 * picture per model slot. Twenty-four cuts against ten colours is 480 keys.
 *
 * So the keys are derived rather than stored. This file is the single place
 * that knows the layout of the assets bucket, and the generator in
 * `tools/generate-previews` writes to exactly these paths — if the scheme moves,
 * it moves here and the next run puts the files somewhere new.
 *
 * No host and no URL: `packages/shared` is used by the Worker and the app, and
 * only the app knows where the bucket is served from.
 */

/**
 * Two models per style, and the swipe is between them.
 *
 * The tile picks one of the two when the strip mounts, so the catalogue looks
 * different between sessions without anything moving on its own — the design
 * system allows exactly four ambient loops and this is not one of them.
 */
export const PREVIEW_SLOTS = [0, 1] as const;

export type PreviewSlot = (typeof PREVIEW_SLOTS)[number];

/**
 * The tile in the style strip. One per style per slot, and deliberately not
 * per colour: the tiles would otherwise all refetch every time someone touched
 * the colour strip, which is the most-touched control on the screen. They are
 * cropped from the default colour's renders, so the strip is internally
 * consistent even though it is not tracking the selection.
 *
 * **Bump `TILE_REVISION` whenever the crop changes.** Tiles are served with a
 * year-long immutable cache, so replacing the picture at a key never reaches
 * anyone who already has it — the edge and the browser both keep the old one,
 * and nothing in the deploy path purges. Changing the key is the supported way
 * to change the picture, which is why the revision is in the filename.
 *
 * r1 cropped the top of the frame, which framed every cut differently because
 * the model puts the crown anywhere from 9% to 29% down the render. r2 finds
 * the crown against the flat backdrop and aligns every tile on it.
 */
export const TILE_REVISION = 2;

export function tileKey(styleId: string, slot: PreviewSlot): string {
  return `styles/${styleId}/tile-${slot}-r${TILE_REVISION}.jpg`;
}

/**
 * The full-frame preview behind the plate, 1080 × 1920. This one *is* per
 * colour — the badge on the plate names a colour, and a picture that does not
 * show it is the plate telling a lie.
 *
 * Carries no revision, and that is deliberate. The heads sit at different
 * depths in these renders, but the fix for that belongs at render time rather
 * than in the file: the plate is `flex: 1` and so is never quite the 9:16 the
 * picture is, and it crops a different band of the image on every screen size.
 * A frame baked into the JPEG can only be right for one of them.
 *
 * So the file stays as the model drew it — the original, kept — and the
 * manifest carries a focus point the app aligns on. See `CatalogueImage.focus`.
 */
export function heroKey(styleId: string, colorId: string, slot: PreviewSlot): string {
  return `styles/${styleId}/${colorId}/${slot}.jpg`;
}
