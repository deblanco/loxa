import { FREE_CREDITS, WEEKLY_CREDITS, isoWeek, type PlanId } from '@loxa/shared';

/**
 * The credit arithmetic, as pure functions over a plain row.
 *
 * Everything about *when* a credit exists and *which* one gets spent lives
 * here, with no database in sight, because these are the rules most likely to
 * be got wrong and least pleasant to debug through a binding.
 */

/** The `device_credits` row, as core sees it. */
export interface CreditState {
  /** The ISO week `weekUsed` was last written in. Null for a device seen for the first time. */
  week: string | null;
  weekUsed: number;
  /** The lifetime free credit, spent or not. Withdrawn: `FREE_CREDITS` is 0. */
  freeUsed: number;
  /** Credits from $0.99 purchases. Survive the weekly reset. */
  extraCredits: number;
  /**
   * The plan this row was last written under. Null for a device seen for the
   * first time.
   *
   * Only `settle` reads it, and only to notice the moment a device becomes a
   * subscriber. See there for why that moment has to zero the counter.
   */
  lastPlan: PlanId | null;
}

export const EMPTY_STATE: CreditState = {
  week: null,
  weekUsed: 0,
  freeUsed: 0,
  extraCredits: 0,
  lastPlan: null,
};

/**
 * How many credits a plan's weekly allowance is worth.
 *
 * A trial is the weekly entitlement as far as the store is concerned, so it is
 * worth the weekly allowance here too — running the trial through RevenueCat
 * rather than through us is what buys that simplicity.
 */
export function weeklyAllowance(plan: PlanId): number {
  return plan === 'free' ? 0 : WEEKLY_CREDITS;
}

/**
 * The row as it should be read *now*.
 *
 * The Monday reset happens here, on read, rather than in a scheduled job: with
 * the week stored beside the count, a rollover is a string comparison. This
 * database has no cron, and adding one to zero a counter would be the tail
 * wagging the dog.
 */
export function rollForward(state: CreditState, now: Date): CreditState {
  const week = isoWeek(now);
  if (state.week === week) return state;
  return { ...state, week, weekUsed: 0 };
}

/**
 * The row as it should be read now, for this plan.
 *
 * Two resets, not one. `rollForward` is the calendar's: every Monday the
 * allowance refills. This is the subscription's: **buying a subscription starts
 * its allowance at zero, whatever day of the week it is.**
 *
 * Without it the two clocks disagree in the user's pocket. Somebody who spends
 * five credits on Tuesday, lets the subscription lapse, buys ten photos, and
 * subscribes again on Thursday was shown 15 of 20 — the five belonged to a
 * subscription that had already ended, and they had just paid full price for
 * the next twenty. It is not farmable: a reset costs another $9.99, and the App
 * Store allows one introductory price per subscription, so the cheap week
 * cannot be bought twice.
 *
 * Only ever *forward* into a subscription. Losing one does not restore the
 * allowance it spent, and re-reading a row while still subscribed changes
 * nothing, so the reset happens once per subscription rather than once per
 * request.
 */
export function settle(state: CreditState, plan: PlanId, now: Date): CreditState {
  const rolled = rollForward(state, now);
  if (rolled.lastPlan === plan) return rolled;
  if (plan === 'free') return { ...rolled, lastPlan: plan };
  return { ...rolled, weekUsed: 0, lastPlan: plan };
}

/** Credits available right now, across all three pools. */
export function available(state: CreditState, plan: PlanId, now: Date): number {
  const rolled = settle(state, plan, now);
  const weekly = Math.max(0, weeklyAllowance(plan) - rolled.weekUsed);
  const free = Math.max(0, FREE_CREDITS - rolled.freeUsed);
  return weekly + free + rolled.extraCredits;
}

/** Which of the three pools a credit came out of. */
export type CreditPool = 'weekly' | 'free' | 'extra';

export interface Spend {
  state: CreditState;
  /** The pool the credit was taken from, so a refund can put it back in that one. */
  pool: CreditPool;
}

/**
 * Take one credit, cheapest pool first.
 *
 * Weekly allowance, then the free lifetime credit, then the ones somebody paid
 * $0.99 for — a bought credit is always the last thing to go, because it is the
 * only one the user would be annoyed to lose. The middle pool is empty while
 * `FREE_CREDITS` is 0, which is the whole of "nothing is free": a free user
 * reaches the bought pool immediately, and reaches the paywall if it is empty.
 *
 * The pool comes back with the row because the refund needs it and cannot
 * recover it later: by the time a render fails, the only thing that says which
 * pool paid is this answer.
 *
 * Returns null when there is nothing to take. The caller turns that into a
 * paywall; it is not an exception because a free user with no credits is the
 * ordinary state of a free user, on their first render as much as their tenth.
 */
export function spendOne(state: CreditState, plan: PlanId, now: Date): Spend | null {
  // `settle`, not `rollForward`: a spend is the first thing that persists the
  // row, so it is where a subscription's fresh allowance gets written down.
  const rolled = settle(state, plan, now);

  if (rolled.weekUsed < weeklyAllowance(plan)) {
    return { state: { ...rolled, weekUsed: rolled.weekUsed + 1 }, pool: 'weekly' };
  }
  if (rolled.freeUsed < FREE_CREDITS) {
    return { state: { ...rolled, freeUsed: rolled.freeUsed + 1 }, pool: 'free' };
  }
  if (rolled.extraCredits > 0) {
    return { state: { ...rolled, extraCredits: rolled.extraCredits - 1 }, pool: 'extra' };
  }
  return null;
}

/**
 * Put one credit back, into the pool it was taken from.
 *
 * A delta rather than a restored snapshot, and that is the whole point. The
 * refund used to rewrite the row as it was read before the render — which threw
 * away anything that landed during it. A $0.99 purchase syncing while the model
 * was working was overwritten back to nothing, and `credit_grant` had already
 * recorded the transaction id, so no restore could ever grant it again: the
 * user paid and got neither the render nor the credit.
 *
 * So this is called with a *freshly read* row and touches one field.
 *
 * `Math.max` because the week can turn between the spend and the failure: the
 * rollover has already zeroed `weekUsed`, and the credit refunded into an
 * allowance that has since refilled is one the user got back anyway.
 */
export function refundOne(state: CreditState, pool: CreditPool, now: Date): CreditState {
  const rolled = rollForward(state, now);

  switch (pool) {
    case 'weekly':
      return { ...rolled, weekUsed: Math.max(0, rolled.weekUsed - 1) };
    case 'free':
      return { ...rolled, freeUsed: Math.max(0, rolled.freeUsed - 1) };
    case 'extra':
      return { ...rolled, extraCredits: rolled.extraCredits + 1 };
  }
}
