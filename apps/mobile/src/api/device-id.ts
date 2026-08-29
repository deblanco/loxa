import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * The device's anonymous id — the whole identity system, and the thing that
 * must outlive everything else in the app.
 *
 * It is the primary key of `device_credits` on the Worker and the RevenueCat
 * customer id. Lose it and the user loses their weekly allowance, their bought
 * credits and their subscription's association, with no account to recover
 * from. So it lives in the **keychain**, not in AsyncStorage.
 *
 * The difference is the whole point of this file:
 *
 * | | App Store update | Delete + reinstall | Restore to a new phone |
 * |---|---|---|---|
 * | AsyncStorage | survives | **gone** | survives |
 * | Keychain | survives | **survives** | survives |
 *
 * Reinstall is not a rare event, and losing bought credits to one would be
 * unrecoverable in a way the user would rightly call theft: `credit_grant` is
 * keyed on the store transaction id, so a restore-purchases re-sync grants
 * nothing the second time — the grant already happened, to an id that no longer
 * exists.
 *
 * `AFTER_FIRST_UNLOCK` rather than the default: the id is read by the API
 * client, and a notification tap can wake the app before the device has been
 * unlocked since boot. `WHEN_UNLOCKED` would fail that read and mint a second
 * identity for the same phone.
 */
const KEY = 'loxa.deviceId';
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

let cached: string | null = null;

export async function deviceId(): Promise<string> {
  if (cached) return cached;

  const stored = await SecureStore.getItemAsync(KEY, OPTIONS).catch(() => null);
  if (stored) {
    cached = stored;
    return stored;
  }

  // Builds before the keychain move kept it here. Carried across rather than
  // regenerated, because regenerating would strand every existing tester's
  // credits on an id nobody can reach any more.
  const legacy = await AsyncStorage.getItem(KEY).catch(() => null);
  if (legacy) {
    await SecureStore.setItemAsync(KEY, legacy, OPTIONS).catch(() => {});
    // Left in AsyncStorage on purpose. Deleting it buys nothing and turns a
    // failed keychain write into a device with no id at all.
    cached = legacy;
    return legacy;
  }

  // `expo-crypto`, not the `crypto` global: Hermes has no such global, and the
  // ReferenceError landed here — on the one line that mints the identity the
  // user's credits hang off, on first launch, where there is nothing to fall
  // back to.
  const fresh = `device-${randomUUID()}`;
  await SecureStore.setItemAsync(KEY, fresh, OPTIONS).catch(() => {});
  // Mirrored, so a keychain that refuses to write does not mint a new identity
  // on every launch — which would look like credits resetting at random.
  await AsyncStorage.setItem(KEY, fresh).catch(() => {});

  cached = fresh;
  return fresh;
}

/** Test seam: the id is memoised for the process lifetime. */
export function resetDeviceIdCache(): void {
  cached = null;
}
