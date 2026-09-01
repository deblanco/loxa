import { INTRO_PRICE_LABEL, SINGLE_PHOTO_PRICE_LABEL, WEEKLY_PRICE_LABEL } from '@loxa/shared';
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
    async pricing() {
      // The shipped labels, so the offer screen reads the way it will on a
      // device. Eligible, because a simulator has never subscribed to anything.
      return {
        price: WEEKLY_PRICE_LABEL.split('/')[0]!,
        introPrice: INTRO_PRICE_LABEL,
        singlePhoto: SINGLE_PHOTO_PRICE_LABEL,
      };
    },

    async buySinglePhoto() {
      return [`fake_${Date.now()}`];
    },
    async restore() {
      return [];
    },
    async managementUrl() {
      // Nothing was really bought, so there is nothing to manage. The caller
      // falls back to Apple's generic page, which is the honest destination.
      return null;
    },
  };
}
