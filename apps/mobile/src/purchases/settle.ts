import type { PurchaseSyncResponse } from '@loxa/shared';

/**
 * A $0.99 photo that was paid for and has not yet been seen as a credit.
 *
 * The Worker grants only what RevenueCat lists, and a sync straight after the
 * App Store sheet can arrive before RevenueCat has recorded the purchase — or
 * not arrive at all. Either way the user has paid and holds nothing, and before
 * this the only way back was finding Restore. So the purchase is written down
 * until a sync grants it, and every launch and foreground asks again.
 */
export interface PendingPurchase {
  /** What the store handed back. The Worker ignores them; the contract wants some. */
  transactionIds: string[];
  /** When it was bought, ISO. */
  at: string;
}

/**
 * How long to keep asking about one purchase.
 *
 * A week, because a purchase RevenueCat has not listed after a week is not
 * lagging, it is lost — a product id missing from the Worker's allow-list, say
 * — and asking on every foreground forever would only hide it. Dropping it is
 * reported, and Restore is still there.
 */
export const PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isStale(pending: PendingPurchase, now: Date): boolean {
  return now.getTime() - new Date(pending.at).getTime() > PENDING_TTL_MS;
}

/**
 * Sync until a credit is granted, a few times, a moment apart.
 *
 * Returns the answer that granted something, or null when every answer was
 * `granted: 0`. A throw on the last attempt is rethrown, so the caller can say
 * the store could not be reached rather than that nothing happened; a throw
 * before it is just another reason to wait and ask again.
 */
export async function syncUntilGranted(
  sync: () => Promise<PurchaseSyncResponse>,
  wait: (ms: number) => Promise<void>,
  attempts: number,
  delayMs = 2_000,
): Promise<PurchaseSyncResponse | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await sync();
      if (result.granted > 0) return result;
    } catch (err) {
      if (attempt === attempts) throw err;
    }
    if (attempt < attempts) await wait(delayMs);
  }
  return null;
}
