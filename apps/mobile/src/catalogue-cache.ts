import { catalogueResponseSchema, type CatalogueResponse } from '@loxa/shared';

/**
 * The catalogue's on-device copy, as pure functions over a string.
 *
 * The envelope is one AsyncStorage value rather than two keys, because two can
 * disagree: a write that half-lands leaves a fresh timestamp on a stale
 * manifest, and the app then trusts a catalogue it should have refetched.
 *
 * Separate from `store/catalogue.ts` so the parts with rules — how old is too
 * old, what is worth keeping — can be tested without AsyncStorage or React.
 */

/**
 * A day, matching the `max-age` the Worker serves.
 *
 * The two are the same number by agreement rather than by accident: the Worker
 * decides how long the edge may answer, and this decides how long the app goes
 * without asking.
 */
export const CATALOGUE_TTL_MS = 24 * 60 * 60 * 1000;

export interface CachedCatalogue {
  catalogue: CatalogueResponse;
  /** Whether it is old enough to be worth revalidating. Never a reason to discard it. */
  stale: boolean;
}

export function serialiseCatalogue(catalogue: CatalogueResponse, now: Date): string {
  return JSON.stringify({ fetchedAt: now.toISOString(), catalogue });
}

/**
 * Read the envelope, or `null` if there is nothing usable in it.
 *
 * `null` for anything that does not parse — corrupt JSON, a `version` this
 * build does not know, a manifest that fails its own referential checks. A
 * cached catalogue is discarded rather than repaired: the network has a good
 * copy, and guessing at a broken one is how a bad upload outlives itself.
 */
export function parseCachedCatalogue(raw: string | null, now: Date): CachedCatalogue | null {
  if (!raw) return null;

  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof envelope !== 'object' || envelope === null) return null;
  const { fetchedAt, catalogue } = envelope as { fetchedAt?: unknown; catalogue?: unknown };
  if (typeof fetchedAt !== 'string') return null;

  const parsed = catalogueResponseSchema.safeParse(catalogue);
  if (!parsed.success) return null;

  const age = now.getTime() - new Date(fetchedAt).getTime();
  // A timestamp from the future is a clock that moved, not a fresh manifest.
  // Treat it as stale and let the network settle it.
  const stale = !Number.isFinite(age) || age < 0 || age >= CATALOGUE_TTL_MS;

  return { catalogue: parsed.data, stale };
}
