import { SINGLE_PHOTO_PRODUCT_ID, WEEKLY_ENTITLEMENT, type PlanId } from '@loxa/shared';
import type { EntitlementsPort } from '../../ports/entitlements';

/**
 * RevenueCat API v2, server-side, with the `sk_` key.
 *
 * The customer id is the device id: the app configures RevenueCat with the same
 * anonymous id it sends us in `X-Device-Id`, which is what makes an account-less
 * app able to have a paywall at all.
 *
 * **Fails closed.** Any error — a network fault, a 403 from using a v1 key, a
 * shape we do not recognise — answers "free" and "not purchased". A deployment
 * that cannot verify a purchase must not assume one; the failure mode of
 * guessing generously is unmetered spend on the most expensive call we make.
 */
const BASE = 'https://api.revenuecat.com/v2';

interface EntitlementsResponse {
  items?: { entitlement_id?: string; expires_at?: number | null }[];
}

interface PurchasesResponse {
  items?: { id?: string; store_purchase_identifier?: string; product_id?: string }[];
}

export interface RevenueCatConfig {
  secretKey: string;
  projectId: string;
  /** RevenueCat's own `entl...` id, when the v2 answer names it that way. */
  weeklyEntitlementId?: string;
  /** RevenueCat's own `prod...` id for the photo, which is what v2 actually returns. */
  singlePhotoProductId?: string;
}

export function revenueCatEntitlements(config: RevenueCatConfig): EntitlementsPort {
  const headers = {
    authorization: `Bearer ${config.secretKey}`,
    'content-type': 'application/json',
  };

  async function get<T>(path: string): Promise<T | null> {
    try {
      const response = await fetch(`${BASE}/projects/${config.projectId}${path}`, { headers });
      if (!response.ok) return null;
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }

  /**
   * Whether a purchase is the photo, in either spelling RevenueCat may use.
   *
   * Deliberately not "anything that is not the weekly product": an unknown id
   * must not become a credit, so this is an allow-list of two.
   */
  function isSinglePhoto(productId: string | undefined): boolean {
    return (
      productId === SINGLE_PHOTO_PRODUCT_ID ||
      (config.singlePhotoProductId !== undefined && productId === config.singlePhotoProductId)
    );
  }

  return {
    async planFor(deviceId) {
      const body = await get<EntitlementsResponse>(
        `/customers/${encodeURIComponent(deviceId)}/active_entitlements`,
      );
      if (!body?.items) return 'free';

      const active = body.items.some(
        (item) =>
          item.entitlement_id === WEEKLY_ENTITLEMENT ||
          (config.weeklyEntitlementId !== undefined &&
            item.entitlement_id === config.weeklyEntitlementId),
      );

      // A trial and a paid week are the same entitlement to the store, and so
      // to us. The app knows which one it is in — it has the offering — and it
      // is the app that prints "Free trial, 2 days left". Nothing here depends
      // on the difference, so nothing here asks.
      return active ? 'weekly' : ('free' satisfies PlanId);
    },

    async verifyPurchase(deviceId, transactionId) {
      const body = await get<PurchasesResponse>(
        `/customers/${encodeURIComponent(deviceId)}/purchases`,
      );
      if (!body?.items) return false;

      // Matched on the store's transaction id *and* the product, so a
      // subscription renewal's id cannot be replayed as a photo purchase.
      //
      // The product half is matched against both spellings because v2 answers
      // with `product_id` as RevenueCat's own `prod...` id, not the store
      // identifier. Comparing only against the store id meant no photo purchase
      // ever verified and no credit was ever granted — a paid $0.99 that
      // returned nothing, and silently, because failing closed here looks
      // exactly like a purchase that did not happen.
      return body.items.some(
        (item) =>
          (item.id === transactionId || item.store_purchase_identifier === transactionId) &&
          isSinglePhoto(item.product_id),
      );
    },
  };
}
