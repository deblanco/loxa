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
 * Two guards, and they defend against different people:
 *
 * - `verifyPurchase` asks the store whether the transaction happened at all,
 *   because the phone is not a trustworthy narrator of its own purchases.
 * - `recordGrant` is keyed on the transaction id, so replaying a real id grants
 *   nothing the second time. The app syncs after a purchase and after a
 *   restore, and a restore hands back every consumable the Apple ID has ever
 *   bought — so this path sees the same ids repeatedly and the idempotency is
 *   not an anti-abuse measure, it is the normal case.
 *
 * Ordered verify-then-record so an unverified id never occupies the primary
 * key: recording first would let a forged id permanently block the real one.
 */
export async function syncPurchases(
  deviceId: string,
  transactionIds: readonly string[],
  deps: SyncPurchasesDeps,
): Promise<SyncPurchasesResult> {
  const now = deps.now();
  let granted = 0;

  for (const transactionId of transactionIds) {
    if (!(await deps.entitlements.verifyPurchase(deviceId, transactionId))) continue;
    if (!(await deps.ledger.recordGrant(deviceId, transactionId, now))) continue;

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
