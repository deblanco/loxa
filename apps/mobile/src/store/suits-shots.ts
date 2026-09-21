import type { PreparedPhoto } from '@/photo';

/**
 * The one or two photographs an analysis is about, between the camera and the
 * screen that asks for it.
 *
 * Held in memory and never written down, which is the same rule
 * `portrait-offer.ts` follows and for the same reason: these are hundreds of
 * kilobytes each, the router already carries the largest strings in this app,
 * and a photo the user then backs out of is work that would have to be undone.
 *
 * They are dropped once the answer lands. What is kept is the verdict, in
 * `analysis.ts` — the Worker does not keep the photographs either.
 */
const shots: (PreparedPhoto | null)[] = [null, null];

export type SuitsSlot = 0 | 1;

export function putSuitsShot(slot: SuitsSlot, photo: PreparedPhoto): void {
  shots[slot] = photo;
}

export function suitsShots(): (PreparedPhoto | null)[] {
  return [shots[0] ?? null, shots[1] ?? null];
}

/** Both slots, in order, for the request. */
export function suitsPhotos(): string[] {
  return suitsShots()
    .filter((shot): shot is PreparedPhoto => shot !== null)
    .map((shot) => shot.base64);
}

export function clearSuitsShots(): void {
  shots[0] = null;
  shots[1] = null;
}
