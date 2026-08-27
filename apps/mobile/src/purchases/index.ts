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
  return key ? revenueCatPurchases(key) : fakePurchases();
}

export type { PurchasesPort };
