import type { PurchasesPort } from './types';

/**
 * A store that always says yes, for the simulator.
 *
 * StoreKit cannot be exercised in a plain simulator run, and a paywall that
 * cannot be dismissed makes every screen behind it unreachable. This is what
 * `EXPO_PUBLIC_REVENUECAT_IOS_KEY` being absent selects.
 *
 * It grants nothing real: the ids it invents are not verifiable, and the
 * Worker's `verifyPurchase` refuses them, which is exactly right — a fake
 * purchase must not become a real credit.
 */
export function fakePurchases(): PurchasesPort {
  return {
    async configure() {},
    async buyWeekly() {
      return true;
    },
    async buySinglePhoto() {
      return [`fake_${Date.now()}`];
    },
    async restore() {
      return [];
    },
  };
}
