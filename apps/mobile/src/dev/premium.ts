import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

/**
 * The development subscriber switch, app side.
 *
 * It only ever *asks*. The flag adds an `X-Dev-Premium` header, and the Worker
 * honours it solely where `DEV_PREMIUM` is set in `.dev.vars` — never in
 * production, where the var is undefined and an undefined switch ignores the
 * header entirely. Nothing here skips a credit check: that stays server-side,
 * which is the whole reason this is a header rather than a local `if`.
 *
 * It exists because the header used to be sent unconditionally under `__DEV__`,
 * which made every development build a subscriber and put the free tier and the
 * paywall — the two paths most worth exercising — out of reach.
 *
 * `__DEV__` guards every call site, so a release build neither reads the key nor
 * sends the header.
 */
const KEY = 'loxa.dev.premium.v1';

let cache = false;
let loaded = false;

/**
 * Subscribers, because the toggle sits on the same screen as the credit card it
 * changes — a hook that only read on mount would show a stale balance beside a
 * switch the user just flipped.
 */
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Drop the in-memory copy. Only the dev reset needs this. */
export function clearDevPremiumCache(): void {
  cache = false;
  loaded = false;
  emit();
}

/** For non-React callers — the API client, on every request. */
export async function isDevPremium(): Promise<boolean> {
  if (!__DEV__) return false;
  if (loaded) return cache;

  try {
    cache = (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    // A development convenience is not worth failing a request over.
    cache = false;
  }
  loaded = true;
  emit();
  return cache;
}

export async function setDevPremium(on: boolean): Promise<void> {
  cache = on;
  loaded = true;
  emit();
  await AsyncStorage.setItem(KEY, on ? '1' : '0').catch(() => {});
}

export function useDevPremium(): { premium: boolean; toggle: () => void } {
  const premium = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => cache,
  );

  // The first read is asynchronous, so the store starts at false and corrects
  // itself once storage answers.
  useEffect(() => {
    void isDevPremium();
  }, []);

  const toggle = useCallback(() => {
    void setDevPremium(!cache);
  }, []);

  return { premium, toggle };
}
