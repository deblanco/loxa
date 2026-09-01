import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

/**
 * Force the introductory price on, for development only.
 *
 * The offer screen prints "Start for $0.99" only when the store says this
 * customer is *eligible* for the intro price, and anything short of a definite
 * yes prints the plain price — see `revenuecat.ts`, where that trade is argued.
 * The consequence is that the intro offer cannot be seen in TestFlight at all:
 * a sandbox account with no receipt answers UNKNOWN, not ELIGIBLE.
 *
 * This switch makes the screen renderable without changing what a real buyer
 * gets. It is a local `if` and nothing more: it does not ask the App Store for
 * a price, and a buyer who is not eligible is still charged the full amount at
 * the sheet. **Never turn this on to decide what to charge someone.**
 *
 * `__DEV__` guards every call site, so a release build neither reads the key
 * nor honours it.
 */
const KEY = 'loxa.dev.intro.v1';

let cache = false;
let loaded = false;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Drop the in-memory copy. Only the dev reset needs this. */
export function clearDevIntroCache(): void {
  cache = false;
  loaded = false;
  emit();
}

async function read(): Promise<boolean> {
  if (!__DEV__) return false;
  if (loaded) return cache;

  try {
    cache = (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    cache = false;
  }
  loaded = true;
  emit();
  return cache;
}

export async function setDevForceIntro(on: boolean): Promise<void> {
  cache = on;
  loaded = true;
  emit();
  await AsyncStorage.setItem(KEY, on ? '1' : '0').catch(() => {});
}

export function useDevForceIntro(): boolean {
  const forced = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => cache,
  );

  useEffect(() => {
    void read();
  }, []);

  return __DEV__ && forced;
}

export function useDevForceIntroToggle(): { forced: boolean; toggle: () => void } {
  const forced = useDevForceIntro();
  const toggle = useCallback(() => {
    void setDevForceIntro(!cache);
  }, []);

  return { forced, toggle };
}
