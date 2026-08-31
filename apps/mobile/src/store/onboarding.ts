import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * Whether the entry and offer screens have been seen.
 *
 * One flag, not a step counter: the two screens before the app are a sales
 * pitch, and somebody who has heard it does not need to hear it again. It is
 * set when they leave the offer screen by either door — subscribing and
 * continuing free are both "seen".
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
