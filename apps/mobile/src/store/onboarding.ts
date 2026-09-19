import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * Whether the entry carousel has been seen.
 *
 * Set by "Get started". The carousel is the one screen before the app, and
 * somebody who has been through it does not need to see it again. The offer
 * that used to follow it now comes after the first render, under its own flag
 * — see `first-offer.ts`.
 */
const KEY = 'loxa.onboarded';

export function useOnboarding() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(KEY).then((value) => setOnboarded(value === '1'));
  }, []);

  const complete = useCallback(async () => {
    await AsyncStorage.setItem(KEY, '1');
    setOnboarded(true);
  }, []);

  return { onboarded, complete };
}
