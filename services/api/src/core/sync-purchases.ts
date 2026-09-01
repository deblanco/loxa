import type { CreditLedgerPort } from '../ports/credit-ledger';
import type { EntitlementsPort } from '../ports/entitlements';
import { available } from './rules';

export interface SyncPurchasesDeps {
  ledger: CreditLedgerPort;
  entitlements: EntitlementsPort;
  now: () => Date;
}

export interface SyncPurchasesResult {
  granted: number;
  creditsLeft: number;
}

/**
 * Turn $0.99 purchases into credits, once each.
 *
 * **The store is asked what was bought; the phone only says when to ask.** The
 * request still carries the transaction ids the SDK handed the app, and they
 * are still ignored — they were never a safe thing to key on. RevenueCat's own
 * `otp...` id for each purchase is, and it is the same id whether this call
 * follows a purchase or a restore.
 *
 * `recordGrant` is keyed on that id, so a device that syncs ten times gets one
 * credit per purchase and no more. The app syncs after every purchase and every
 * restore, so seeing the same ids repeatedly is the normal case rather than an
 * attack, and the idempotency is what makes both paths safe to call freely.
 *
 * Ordered enumerate-then-record so an id the store does not vouch for never
 * occupies the primary key: recording first would let a forged one permanently
 * block the real purchase behind it.
 */
export async function syncPurchases(
  deviceId: string,
  deps: SyncPurchasesDeps,
): Promise<SyncPurchasesResult> {
  const now = deps.now();
  let granted = 0;

  for (const purchaseId of await deps.entitlements.photoPurchases(deviceId)) {
    if (!(await deps.ledger.recordGrant(deviceId, purchaseId, now))) continue;

    // Re-read inside the loop: `recordGrant` and this write are two statements,
    // and a second request for the same device may have landed between them.
    const state = await deps.ledger.read(deviceId);
    await deps.ledger.write(deviceId, { ...state, extraCredits: state.extraCredits + 1 });
    granted += 1;
  }

  const [state, plan] = await Promise.all([
    deps.ledger.read(deviceId),
    deps.entitlements.planFor(deviceId),
  ]);

  return { granted, creditsLeft: available(state, plan, now) };
}
