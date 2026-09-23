import { SINGLE_PHOTO_PRODUCT_ID, WEEKLY_ENTITLEMENT, type PlanId } from '@loxa/shared';
import { EntitlementsUnavailableError } from '../../core/errors';
import type { EntitlementsPort } from '../../ports/entitlements';

/**
 * RevenueCat API v2, server-side, with the `sk_` key.
 *
 * The customer id is the device id: the app configures RevenueCat with the same
 * anonymous id it sends us in `X-Device-Id`, which is what makes an account-less
 * app able to have a paywall at all.
 *
 * **Fails closed, and says so.** Any error — a network fault, a 403 from using a
 * v1 key, a rate limit, a shape we do not recognise — throws
 * `EntitlementsUnavailableError`. It used to answer "free" and "not purchased",
 * which never granted anything it should not have, but did spend a
 * subscriber's bought credit in place of their allowance for as long as the
 * outage lasted. Unknown is its own answer: nothing is spent or granted on it.
 *
 * A 404 is the one failure that is an answer. RevenueCat has never seen this
 * customer, which is every device before its first purchase: free, nothing
 * bought.
 */
const BASE = 'https://api.revenuecat.com/v2';

interface EntitlementItem {
  entitlement_id?: string;
  expires_at?: number | null;
}

interface PurchaseItem {
  id?: string;
  product_id?: string;
  status?: string;
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

  /** The `items` of a v2 list, or null for a customer RevenueCat does not know. */
  async function list<T>(path: string): Promise<T[] | null> {
    let response: Response;
    try {
      response = await fetch(`${BASE}/projects/${config.projectId}${path}`, { headers });
    } catch (err) {
      throw new EntitlementsUnavailableError(
        err instanceof Error ? err.message : 'RevenueCat could not be reached',
      );
    }

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new EntitlementsUnavailableError(`RevenueCat answered ${response.status}`);
    }

    const body = (await response.json().catch(() => null)) as { items?: unknown } | null;
    if (!Array.isArray(body?.items)) {
      throw new EntitlementsUnavailableError('RevenueCat answered a shape we do not recognise');
    }
    return body.items as T[];
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
      const items = await list<EntitlementItem>(
        `/customers/${encodeURIComponent(deviceId)}/active_entitlements`,
      );
      if (!items) return 'free';

      const active = items.some(
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

    async photoPurchases(deviceId) {
      const items = await list<PurchaseItem>(
        `/customers/${encodeURIComponent(deviceId)}/purchases`,
      );
      if (!items) return [];

      // Filtered on the product, so a subscription renewal in the same list
      // cannot become a photo credit, and on the status, so a refunded photo
      // does not stay bought. `id` is RevenueCat's own `otp...`: stable, and
      // what `credit_grant` is keyed on.
      return items
        .filter((item) => isSinglePhoto(item.product_id) && item.status !== 'refunded')
        .map((item) => item.id)
        .filter((id): id is string => typeof id === 'string');
    },
  };
}
