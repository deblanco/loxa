import { fakePurchases } from './fake';
import { revenueCatPurchases } from './revenuecat';
import type { PurchasesPort } from './types';

/**
 * Which store the app is talking to.
 *
 * No key means the simulator, and the simulator gets the fake — a paywall that
 * cannot be dismissed hides every screen behind it. The fake's purchases are
 * unverifiable by design, so this cannot leak real credits.
 */
export function purchases(): PurchasesPort {
  const key = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  if (key) return revenueCatPurchases(key);

  // Loud rather than silent outside development. Every `eas.json` profile sets
  // the key, so reaching this in a release build means a build was cut without
  // one — and the fake's `buyWeekly` returns true, so the paywall would tell
  // somebody they had subscribed when nothing had been bought. The Worker
  // still refuses the credits, which makes it a support ticket rather than a
  // loss, but it is not a thing to find out from a support ticket.
  if (!__DEV__) throw new Error('EXPO_PUBLIC_REVENUECAT_IOS_KEY is missing from this build');
  return fakePurchases();
}

export { restoreAndSync, type RestoreOutcome } from './restore';
export { usePricing } from './usePricing';
export type { Pricing, PurchasesPort } from './types';
