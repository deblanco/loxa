import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Whether the subscription offer has had its one unprompted showing.
 *
 * It used to be the second screen of the app, in front of everything, which
 * asked somebody to pay for a product they had not seen. It now comes once,
 * after the first render — the free one — when the user leaves the result. By
 * then they have seen their own face with a different cut, which is the only
 * thing the offer has to sell.
 *
 * Settled by either door, like the onboarding flag it replaces: subscribing and
 * declining are both "seen". The out-of-credits sheet is a different thing and
 * is not governed by this; it appears whenever there is nothing to spend.
 *
 * Fails quiet in both directions. A flag that will not read is treated as
 * settled, because an offer that fails to appear costs nothing, and an offer
 * that appears on every render is the kind that gets the app deleted.
 */
const KEY = 'loxa.firstOffer.v1';

export async function firstOfferDue(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === null;
  } catch {
    return false;
  }
}

export async function settleFirstOffer(): Promise<void> {
  await AsyncStorage.setItem(KEY, new Date().toISOString()).catch(() => {});
}
