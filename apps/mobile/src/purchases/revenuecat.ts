import Purchases, { INTRO_ELIGIBILITY_STATUS, PURCHASES_ERROR_CODE } from 'react-native-purchases';
import { SINGLE_PHOTO_PRODUCT_ID, WEEKLY_PRODUCT_ID } from '@loxa/shared';
import type { PurchasesPort } from './types';

/**
 * RevenueCat on the device.
 *
 * Configured with the anonymous device id as the app user id, which is what
 * lets the Worker look the same customer up server-side with the `sk_` key. The
 * key here is publishable and can only buy on behalf of the phone holding it.
 *
 * Nothing in this file grants a credit. It reports transaction ids; the Worker
 * decides whether they were real.
 */
export function revenueCatPurchases(apiKey: string): PurchasesPort {
  return {
    async configure(deviceId) {
      Purchases.configure({ apiKey, appUserID: deviceId });
    },

    async buyWeekly() {
      try {
        const products = await Purchases.getProducts([WEEKLY_PRODUCT_ID]);
        if (!products[0]) return false;
        await Purchases.purchaseStoreProduct(products[0]);
        return true;
      } catch (err) {
        // Backing out of the sheet is the commonest outcome here and is not a
        // failure worth showing an error for.
        if (isCancellation(err)) return false;
        throw err;
      }
    },

    async weeklyPricing() {
      try {
        const [product] = await Purchases.getProducts([WEEKLY_PRODUCT_ID]);
        if (!product) return null;

        // `introPrice` is set whenever the *product* carries an offer, which is
        // always — so it says nothing about whether this customer can have it.
        // Only the eligibility call knows that, and anything short of a
        // definite yes prints the plain price: RevenueCat answers UNKNOWN when
        // it cannot reach the subscription group, and an offer shown to
        // somebody the App Store then charges $9.99 is a lie told at the sheet.
        const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility([
          WEEKLY_PRODUCT_ID,
        ]);
        const eligible =
          eligibility[WEEKLY_PRODUCT_ID]?.status ===
          INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;

        return {
          price: product.priceString,
          introPrice: eligible ? (product.introPrice?.priceString ?? null) : null,
        };
      } catch {
        // A price we could not fetch is not an error worth a screen: the caller
        // falls back to the shipped label rather than rendering a hole.
        return null;
      }
    },

    async buySinglePhoto() {
      try {
        const products = await Purchases.getProducts([SINGLE_PHOTO_PRODUCT_ID]);
        if (!products[0]) return null;

        const { customerInfo } = await Purchases.purchaseStoreProduct(products[0]);
        return customerInfo.nonSubscriptionTransactions.map((t) => t.transactionIdentifier);
      } catch (err) {
        if (isCancellation(err)) return null;
        throw err;
      }
    },

    async restore() {
      const customerInfo = await Purchases.restorePurchases();
      return customerInfo.nonSubscriptionTransactions.map((t) => t.transactionIdentifier);
    },
  };
}

function isCancellation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}
