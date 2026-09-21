import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConsentKind } from '@/consent';

/**
 * Whether somebody has agreed to a kind of photo leaving their phone.
 *
 * The version is in the key, as literals, because `dev/reset.ts` is checked
 * against the source for exactly this shape. Changing who receives a photo, or
 * what is done with it, means bumping the suffix: nobody has agreed to *that*,
 * and the sheet asks again.
 *
 * The value is when they agreed, which is more use to a support conversation
 * than a bare `true`, and costs nothing.
 */
const KEYS: Record<ConsentKind, string> = {
  render: 'loxa.consent.render.v1',
  analysis: 'loxa.consent.analysis.v1',
};

/**
 * Fails closed: a store that cannot be read is "no", which asks again.
 *
 * The opposite failure — a photo sent because a read threw — is the one this
 * whole file exists to prevent.
 */
export async function hasConsent(kind: ConsentKind): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEYS[kind])) !== null;
  } catch {
    return false;
  }
}

export async function grantConsent(kind: ConsentKind): Promise<void> {
  await AsyncStorage.setItem(KEYS[kind], new Date().toISOString());
}
