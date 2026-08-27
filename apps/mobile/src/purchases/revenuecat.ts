import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases';
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
