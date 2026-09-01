import Purchases, { INTRO_ELIGIBILITY_STATUS, PURCHASES_ERROR_CODE } from 'react-native-purchases';
import { SINGLE_PHOTO_PRODUCT_ID, WEEKLY_PRODUCT_ID } from '@loxa/shared';
import { reportHandled } from '@/diagnostics';
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

    async pricing() {
      try {
        // Both products in one call: they are printed together, and asking
        // twice is a second chance for one of them to come back missing.
        const products = await Purchases.getProducts([WEEKLY_PRODUCT_ID, SINGLE_PHOTO_PRODUCT_ID]);
        const product = products.find((p) => p.identifier === WEEKLY_PRODUCT_ID);
        const single = products.find((p) => p.identifier === SINGLE_PHOTO_PRODUCT_ID);
        if (!product || !single) {
          // The screen falls back to the shipped labels and says nothing, which
          // is why this went unnoticed: a paywall quoting the wrong currency
          // looks exactly like a paywall quoting the right one. Naming which id
          // was missing is the difference between "prices are wrong" and a
          // product that was never approved in App Store Connect.
          reportHandled(
            new Error(
              `store returned ${products.length} of 2 products` +
                `${product ? '' : ` · missing ${WEEKLY_PRODUCT_ID}`}` +
                `${single ? '' : ` · missing ${SINGLE_PHOTO_PRODUCT_ID}`}`,
            ),
            'pricing.products',
          );
          return null;
        }

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

        if (!eligible) {
          // Expected for anyone who has subscribed before, and expected in
          // sandbox, where there is no receipt to judge from and the answer is
          // UNKNOWN. Reported anyway because the offer screen silently becomes
          // a plain "Subscribe" and there is otherwise no way to tell those two
          // apart from the outside.
          reportHandled(
            new Error(
              `intro not offered · eligibility=${String(
                eligibility[WEEKLY_PRODUCT_ID]?.status,
              )} · product has introPrice=${String(Boolean(product.introPrice))}`,
            ),
            'pricing.eligibility',
          );
        }

        return {
          price: product.priceString,
          introPrice: eligible ? (product.introPrice?.priceString ?? null) : null,
          singlePhoto: single.priceString,
        };
      } catch (err) {
        // A price we could not fetch is not an error worth a screen: the caller
        // falls back to the shipped label rather than rendering a hole. It is
        // worth a report, though — this branch is why a screen can show a US
        // dollar price to a reader the sheet will charge in euros.
        reportHandled(err, 'pricing');
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

    /**
     * Imported at press time rather than at module load.
     *
     * `react-native-purchases-ui` is a native module, and a dev client built
     * before it was added does not have the pod. A top-level import would make
     * that a crash on the first screen; deferring it makes it a `false` here
     * and Apple's page instead — which is where this button went before.
     */
    async presentCustomerCenter() {
      try {
        const { default: RevenueCatUI } = await import('react-native-purchases-ui');
        await RevenueCatUI.presentCustomerCenter();
        return true;
      } catch (err) {
        // Worth hearing about: the commonest cause is Customer Center not
        // being configured in the RevenueCat dashboard, which is invisible
        // from here and looks exactly like the old behaviour.
        reportHandled(err, 'customerCenter');
        return false;
      }
    },

    async managementUrl() {
      try {
        const { managementURL } = await Purchases.getCustomerInfo();
        return managementURL;
      } catch {
        // The caller falls back to the generic App Store page, which is where
        // this button went unconditionally before.
        return null;
      }
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
