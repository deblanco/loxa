import { nextWeeklyReset, type PlanId } from '@loxa/shared';
import type { CreditLedgerPort } from '../ports/credit-ledger';
import type { EntitlementsPort } from '../ports/entitlements';
import { available, settle, weeklyAllowance } from './rules';

export interface GetCreditsDeps {
  ledger: CreditLedgerPort;
  entitlements: EntitlementsPort;
  now: () => Date;
}

export interface CreditsView {
  creditsLeft: number;
  cap: number;
  plan: PlanId;
  resetsAt: string;
}

/**
 * What the credit chip and the profile screen read.
 *
 * **Writes exactly once, and only when the plan has changed under it.** A read
 * that mutates races with every other read, so the Monday rollover is still
 * only ever reported here and persisted by a spend.
 *
 * The plan cannot wait for a spend. `settle` starts a subscription's allowance
 * at zero by noticing `lastPlan` change, and `lastPlan` was only ever written
 * by `spendOne` — but a subscriber who has spent the week's twenty and then
 * lapses has nothing left to spend, so the free interval left no trace. They
 * would resubscribe, `settle` would compare weekly against a stale weekly, find
 * no change, and hand them the exhausted counter they had just paid to replace.
 *
 * Observing the change is what records it. The write is idempotent — two
 * concurrent reads compute the same row — and it happens on the one request
 * that is guaranteed to run before any purchase can be spent, because the app
 * reads the balance on every launch and after every purchase.
 */
export async function getCredits(deviceId: string, deps: GetCreditsDeps): Promise<CreditsView> {
  const now = deps.now();
  const [state, plan] = await Promise.all([
    deps.ledger.read(deviceId),
    deps.entitlements.planFor(deviceId),
  ]);

  const settled = settle(state, plan, now);
  if (settled.lastPlan !== state.lastPlan) await deps.ledger.write(deviceId, settled);

  return {
    creditsLeft: available(state, plan, now),
    cap: weeklyAllowance(plan),
    plan,
    resetsAt: nextWeeklyReset(now).toISOString(),
  };
}
