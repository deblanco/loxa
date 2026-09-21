import type { PreparedPhoto } from '@/photo';

/**
 * The photograph a render is about to be made from, between the screen that
 * produced it and the one that sends it.
 *
 * Held in memory and never written down, for the reasons `suits-shots.ts` gives:
 * it is about 700KB of base64, and the router was carrying it twice on the way to
 * a render — camera to confirm, confirm to generating. Route parameters are
 * serialised on every navigation, and a photo that arrived on Confirm as nothing
 * looked exactly like a Try On that did nothing. The router now carries only the
 * ids of the cut and the colour.
 *
 * One slot, and whoever wrote it last wins. It is cleared when a render has been
 * saved, so a later Try On from the saved portrait can never pick up a photo from
 * an earlier one: Confirm reads this only when it was not told `source=saved`.
 */
let shot: PreparedPhoto | null = null;

export function putRenderShot(photo: PreparedPhoto): void {
  shot = photo;
}

export function renderShot(): PreparedPhoto | null {
  return shot;
}

export function clearRenderShot(): void {
  shot = null;
}
