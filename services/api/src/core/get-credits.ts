import { nextWeeklyReset, type PlanId } from '@loxa/shared';
import type { CreditLedgerPort } from '../ports/credit-ledger';
import type { EntitlementsPort } from '../ports/entitlements';
import { available, weeklyAllowance } from './rules';

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
 * Does not write. A device that has not been seen since last Monday reports the
 * rolled-forward number without persisting the roll — the write happens when a
 * credit is actually spent, and a read that mutates is a read that races with
 * every other read.
 */
export async function getCredits(deviceId: string, deps: GetCreditsDeps): Promise<CreditsView> {
  const now = deps.now();
  const [state, plan] = await Promise.all([
    deps.ledger.read(deviceId),
    deps.entitlements.planFor(deviceId),
  ]);

  return {
    creditsLeft: available(state, plan, now),
    cap: weeklyAllowance(plan),
    plan,
    resetsAt: nextWeeklyReset(now).toISOString(),
  };
}
