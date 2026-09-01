import { useEffect, useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { CreditsResponse } from '@loxa/shared';
import { fetchCredits } from '../api/client';

/**
 * The credit balance, as the app sees it.
 *
 * The server is the authority — the chip is a display of a number the Worker
 * owns, never a counter the app decrements on its own. Every route that spends
 * one returns the new balance, and `set` is how a screen hands that back here
 * without a second round trip.
 *
 * **One copy for the whole app**, in a module rather than in a hook. It used to
 * be per-hook state, on the reasoning that the balance is a single number every
 * route hands back. That holds while the screen doing the spending is the
 * screen doing the showing. It stops holding the moment a modal changes the
 * balance on top of another screen: the paywall bought a credit, refreshed its
 * own copy, and popped, leaving the preview underneath displaying whatever it
 * had last fetched. Four `useCredits` calls meant four balances that could
 * disagree, and the one on screen was not always the fresh one.
 */
type State = { credits: CreditsResponse | null; loading: boolean };

let state: State = { credits: null, loading: true };
let inflight: Promise<void> | null = null;

const listeners = new Set<() => void>();

function emit(next: State): void {
  // A new object every time: `useSyncExternalStore` compares snapshots by
  // identity, so mutating this one in place would publish nothing.
  state = next;
  for (const listener of listeners) listener();
}

async function load(): Promise<void> {
  try {
    emit({ credits: await fetchCredits(), loading: false });
  } catch {
    // A failed refresh leaves the last known number on screen rather than
    // blanking the chip. The next spend will correct it, and a spend the
    // server refuses shows the paywall regardless of what the chip said.
    emit({ ...state, loading: false });
  }
}

/** Concurrent callers share one request: four screens must not be four fetches. */
export function refreshCredits(): Promise<void> {
  inflight ??= load().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** The new balance a spend or a sync just returned, without a second round trip. */
export function setCreditsLeft(creditsLeft: number): void {
  if (!state.credits) return;
  emit({ ...state, credits: { ...state.credits, creditsLeft } });
}

/**
 * How often to ask anyway, while somebody is looking.
 *
 * The balance is pushed by every route that changes it, so this is a safety
 * net rather than the mechanism — for the change that happens *outside* the
 * app, which is the one nothing can push: a purchase that RevenueCat and our
 * Worker settle a moment after the App Store sheet closes, a subscription that
 * renews while the app is open, a credit granted to this device from another
 * install of it. A minute is short enough that nobody sits looking at a stale
 * chip and long enough that an idle app is not a pager.
 */
const POLL_MS = 60_000;

let timer: ReturnType<typeof setInterval> | null = null;
let appStateSub: { remove: () => void } | null = null;

function onAppStateChange(status: AppStateStatus): void {
  // Coming back from the App Store sheet, from Settings, from anywhere: the
  // balance may have moved while we were not running, and waiting out the rest
  // of an interval to notice would show a stale number at exactly the moment
  // the user went to change it.
  if (status === 'active') void refreshCredits();
}

function startPolling(): void {
  if (timer) return;
  timer = setInterval(() => {
    if (AppState.currentState === 'active') void refreshCredits();
  }, POLL_MS);
  appStateSub = AppState.addEventListener('change', onAppStateChange);
}

function stopPolling(): void {
  if (timer) clearInterval(timer);
  timer = null;
  appStateSub?.remove();
  appStateSub = null;
}

export function useCredits() {
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      // The first screen to want a balance starts the polling; the last one to
      // unmount stops it, so a backgrounded app with nothing on screen is not
      // holding a timer.
      if (listeners.size === 1) startPolling();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stopPolling();
      };
    },
    () => state,
  );

  useEffect(() => {
    void refreshCredits();
  }, []);

  return {
    credits: snapshot.credits,
    loading: snapshot.loading,
    refresh: refreshCredits,
    set: setCreditsLeft,
  };
}
