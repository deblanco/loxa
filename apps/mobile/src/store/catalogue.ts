import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';
import type { CatalogueResponse } from '@loxa/shared';
import { fetchCatalogue } from '../api/client';
import { parseCachedCatalogue, serialiseCatalogue } from '../catalogue-cache';

/**
 * The catalogue the app draws, and where it comes from.
 *
 * One copy for the whole app, held in a module rather than in a hook: the
 * preview screen is the only reader today, but a per-hook copy would mean a
 * second screen fetching a second manifest and the two disagreeing about which
 * cuts exist. `useCredits` gets away with per-hook state because it holds one
 * number that every route hands back; this holds the catalogue.
 *
 * The rules live next door in `catalogue-cache.ts` and `catalogue.ts`, which is
 * why this file is only plumbing: read a string, parse it, fetch, write it back,
 * tell the subscribers.
 */
const KEY = 'loxa.catalogue.v1';

export type CatalogueState =
  | { status: 'loading'; catalogue: null }
  | { status: 'ready'; catalogue: CatalogueResponse }
  | { status: 'unavailable'; catalogue: null };

let state: CatalogueState = { status: 'loading', catalogue: null };
let inflight: Promise<void> | null = null;

const listeners = new Set<() => void>();

function emit(next: CatalogueState): void {
  // Reassigned only on a real change, because `useSyncExternalStore` compares
  // snapshots by identity and would re-render every subscriber otherwise.
  state = next;
  for (const listener of listeners) listener();
}

/** Drop the in-memory copy. Only the dev reset needs this. */
export function clearCatalogueCache(): void {
  inflight = null;
  emit({ status: 'loading', catalogue: null });
}

async function load(): Promise<void> {
  const now = new Date();

  let cached: ReturnType<typeof parseCachedCatalogue> = null;
  try {
    cached = parseCachedCatalogue(await AsyncStorage.getItem(KEY), now);
  } catch {
    // Storage that will not answer is the same as storage with nothing in it.
  }

  // Published before the network is asked, however old it is. A screen that has
  // an answer must never wait for a better one.
  if (cached) emit({ status: 'ready', catalogue: cached.catalogue });

  // Fresh enough, and already on screen. Nothing to ask for.
  if (cached && !cached.stale) return;

  try {
    const catalogue = await fetchCatalogue();
    await AsyncStorage.setItem(KEY, serialiseCatalogue(catalogue, now)).catch(() => {});
    emit({ status: 'ready', catalogue });
  } catch {
    // A failed revalidate keeps what is on screen. The age of a manifest
    // decides whether to *ask*, never whether to *keep* — this is the offline
    // path, and discarding a stale catalogue here would empty the app the
    // moment the network went away.
    if (!cached) emit({ status: 'unavailable', catalogue: null });
  }
}

/**
 * For non-React callers — the root layout, warming the cache behind the splash.
 *
 * Concurrent calls share one request: five mounts must not be five manifests.
 */
export function loadCatalogue(): Promise<void> {
  inflight ??= load().finally(() => {
    inflight = null;
  });
  return inflight;
}

export function useCatalogue(): CatalogueState & { reload: () => void } {
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );

  useEffect(() => {
    void loadCatalogue();
  }, []);

  return {
    ...snapshot,
    reload: () => {
      if (state.status === 'unavailable') emit({ status: 'loading', catalogue: null });
      void loadCatalogue();
    },
  };
}
