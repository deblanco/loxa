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
}

export const EMPTY_STATE: CreditState = { week: null, weekUsed: 0, freeUsed: 0, extraCredits: 0 };

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

/** Credits available right now, across all three pools. */
export function available(state: CreditState, plan: PlanId, now: Date): number {
  const rolled = rollForward(state, now);
  const weekly = Math.max(0, weeklyAllowance(plan) - rolled.weekUsed);
  const free = Math.max(0, FREE_CREDITS - rolled.freeUsed);
  return weekly + free + rolled.extraCredits;
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
 * Returns null when there is nothing to take. The caller turns that into a
 * paywall; it is not an exception because a free user with no credits is the
 * ordinary state of a free user, on their first render as much as their tenth.
 */
export function spendOne(state: CreditState, plan: PlanId, now: Date): CreditState | null {
  const rolled = rollForward(state, now);

  if (rolled.weekUsed < weeklyAllowance(plan)) {
    return { ...rolled, weekUsed: rolled.weekUsed + 1 };
  }
  if (rolled.freeUsed < FREE_CREDITS) {
    return { ...rolled, freeUsed: rolled.freeUsed + 1 };
  }
  if (rolled.extraCredits > 0) {
    return { ...rolled, extraCredits: rolled.extraCredits - 1 };
  }
  return null;
}
