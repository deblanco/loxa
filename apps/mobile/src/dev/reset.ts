import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { resetDeviceIdCache } from '@/api/device-id';
import { clearDevPremiumCache } from '@/dev/premium';
import { disableDaily } from '@/notifications';

/**
 * Wipe every trace of this install, for development only.
 *
 * Onboarding runs once and the free credit is a lifetime credit, so the only
 * honest way to see either of them twice is to put the app back to how it ships.
 *
 * **Deleting the app is not equivalent, and that is the point.** The device id
 * lives in the keychain precisely so that it survives a reinstall — see
 * `src/api/device-id.ts` — which means uninstalling gives the same identity back
 * and the same spent credit with it. This is the only way to get a genuinely
 * fresh device without editing D1 by hand.
 */

/** Every AsyncStorage key the app writes. Kept here so a new store shows up as a conflict. */
const KEYS = [
  'loxa.onboarded',
  'loxa.dev.premium.v1',
  /**
   * The AsyncStorage mirror of the device id. The keychain copy below is the
   * real one; this exists so a keychain that refuses to write does not mint a
   * new identity on every launch. Both have to go or the survivor is restored.
   */
  'loxa.deviceId',
];

/** The keychain entry, which outlives everything else including the app itself. */
const SECURE_KEYS = ['loxa.deviceId'];

/** Generated looks, written to the documents directory. */
const DIRS = ['looks'];

export async function resetAppState(): Promise<void> {
  // Scheduled notifications are held by iOS, not by us, so wiping storage would
  // otherwise leave a daily style suggestion firing for an install that no
  // longer exists.
  await disableDaily().catch(() => {});

  await AsyncStorage.multiRemove(KEYS).catch(() => {});

  for (const key of SECURE_KEYS) {
    await SecureStore.deleteItemAsync(key).catch(() => {});
  }

  for (const name of DIRS) {
    try {
      const dir = new Directory(Paths.document, name);
      if (dir.exists) dir.delete();
    } catch {
      // A directory that will not delete is not worth failing the reset over;
      // the store rebuilds it on demand.
    }
  }

  // Last, so a failure above cannot leave a cache pointing at something deleted.
  // The device id is memoised for the process lifetime, so without this the app
  // keeps sending the identity it just erased.
  resetDeviceIdCache();
  clearDevPremiumCache();
}
