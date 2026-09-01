import { describe, expect, it } from 'vitest';
import {
  EMPTY_STATE,
  available,
  refundOne,
  rollForward,
  settle,
  spendOne,
  weeklyAllowance,
  type CreditState,
} from '../src/core/rules';

const THURSDAY = new Date('2026-08-27T12:00:00Z'); // 2026-W35
const NEXT_MONDAY = new Date('2026-08-31T09:00:00Z'); // 2026-W36

const state = (over: Partial<CreditState> = {}): CreditState => ({
  ...EMPTY_STATE,
  week: '2026-W35',
  ...over,
});

describe('weeklyAllowance', () => {
  it('gives a subscriber twenty and a free user none', () => {
    expect(weeklyAllowance('weekly')).toBe(20);
    expect(weeklyAllowance('free')).toBe(0);
  });
});

describe('settle', () => {
  it('starts the allowance over when a subscription is bought', () => {
    // The bug this exists for: five credits spent earlier in the week under a
    // subscription that has since lapsed, then a new one bought on Thursday.
    // Without this the buyer is shown 15 of the 20 they just paid for.
    const s = state({ weekUsed: 5, lastPlan: 'free' });
    expect(settle(s, 'weekly', THURSDAY)).toEqual(
      expect.objectContaining({ weekUsed: 0, lastPlan: 'weekly' }),
    );
    expect(available(s, 'weekly', THURSDAY)).toBe(20);
  });

  it('leaves an existing subscriber alone', () => {
    // Otherwise every read would refill the allowance and the week would never
    // be spent at all.
    const s = state({ weekUsed: 5, lastPlan: 'weekly' });
    expect(settle(s, 'weekly', THURSDAY).weekUsed).toBe(5);
    expect(available(s, 'weekly', THURSDAY)).toBe(15);
  });

  it('does not refill on the way out of a subscription', () => {
    // Losing a subscription does not give back what it spent, and a free user
    // has no weekly allowance to refill anyway.
    const s = state({ weekUsed: 5, lastPlan: 'weekly' });
    expect(settle(s, 'free', THURSDAY)).toEqual(
      expect.objectContaining({ weekUsed: 5, lastPlan: 'free' }),
    );
  });

  it('treats a device it has never seen subscribed as a purchase', () => {
    // `lastPlan` is null for every row written before the column existed. The
    // reset it costs is harmless: their allowance is the one they are paying
    // for right now.
    expect(settle(state({ weekUsed: 4 }), 'weekly', THURSDAY).weekUsed).toBe(0);
  });

  it('rolls the week first, so Monday still wins', () => {
    const s = state({ weekUsed: 9, lastPlan: 'weekly' });
    expect(settle(s, 'weekly', NEXT_MONDAY)).toEqual(
      expect.objectContaining({ week: '2026-W36', weekUsed: 0 }),
    );
  });
});

describe('rollForward', () => {
  it('leaves the row alone inside the same week', () => {
    const s = state({ weekUsed: 7 });
    expect(rollForward(s, THURSDAY)).toBe(s);
  });

  it('zeroes the weekly counter once the week has turned', () => {
    expect(rollForward(state({ weekUsed: 20 }), NEXT_MONDAY)).toEqual(
      expect.objectContaining({ week: '2026-W36', weekUsed: 0 }),
    );
  });

  it('does not refill the free credit or touch bought ones', () => {
    const rolled = rollForward(state({ weekUsed: 20, freeUsed: 1, extraCredits: 2 }), NEXT_MONDAY);
    expect(rolled.freeUsed).toBe(1);
    expect(rolled.extraCredits).toBe(2);
  });

  it('treats a never-seen device as due a roll', () => {
    expect(rollForward(EMPTY_STATE, THURSDAY).week).toBe('2026-W35');
  });
});

describe('available', () => {
  it('gives a new free device nothing at all', () => {
    expect(available(EMPTY_STATE, 'free', THURSDAY)).toBe(0);
  });

  it('gives a new subscriber the allowance and nothing on top', () => {
    expect(available(EMPTY_STATE, 'weekly', THURSDAY)).toBe(20);
  });

  it('adds bought credits to whatever is left', () => {
    expect(available(state({ freeUsed: 1, extraCredits: 3 }), 'free', THURSDAY)).toBe(3);
  });

  it('reports the refilled allowance after Monday without anyone writing', () => {
    expect(available(state({ weekUsed: 20, freeUsed: 1 }), 'weekly', NEXT_MONDAY)).toBe(20);
  });

  it('never goes negative when an allowance shrinks under a spent counter', () => {
    // A subscriber who lapses mid-week: weekUsed is 12, the allowance is now 0.
    expect(available(state({ weekUsed: 12, freeUsed: 1 }), 'free', THURSDAY)).toBe(0);
  });
});

describe('spendOne', () => {
  it('takes from the weekly allowance first', () => {
    const spent = spendOne(state({ extraCredits: 1 }), 'weekly', THURSDAY);
    expect(spent?.state).toEqual(
      expect.objectContaining({ weekUsed: 1, freeUsed: 0, extraCredits: 1 }),
    );
    expect(spent?.pool).toBe('weekly');
  });

  it('never grants a free credit: a free user spends what they bought', () => {
    const spent = spendOne(state({ extraCredits: 1 }), 'free', THURSDAY);
    expect(spent?.state).toEqual(expect.objectContaining({ freeUsed: 0, extraCredits: 0 }));
    expect(spent?.pool).toBe('extra');
  });

  it('touches a bought credit only when nothing else is left', () => {
    const spent = spendOne(state({ extraCredits: 2 }), 'free', THURSDAY);
    expect(spent?.state.extraCredits).toBe(1);
    expect(spent?.pool).toBe('extra');
  });

  it('returns null with nothing to take', () => {
    expect(spendOne(state(), 'free', THURSDAY)).toBeNull();
    // `lastPlan` matters now: an exhausted subscriber is one who was already
    // subscribed. Arriving as a subscriber for the first time is a purchase,
    // and a purchase refills the allowance.
    expect(
      spendOne(state({ weekUsed: 20, freeUsed: 1, lastPlan: 'weekly' }), 'weekly', THURSDAY),
    ).toBeNull();
  });

  it('rolls the week before deciding', () => {
    // Out of credits on Sunday, twenty again on Monday, with no separate reset.
    const spent = spendOne(state({ weekUsed: 20, freeUsed: 1 }), 'weekly', NEXT_MONDAY);
    expect(spent?.state).toEqual(expect.objectContaining({ week: '2026-W36', weekUsed: 1 }));
  });
});

describe('refundOne', () => {
  it('puts a weekly credit back on the weekly counter', () => {
    expect(refundOne(state({ weekUsed: 6 }), 'weekly', THURSDAY).weekUsed).toBe(5);
  });

  it('puts a bought credit back on the bought pool', () => {
    expect(refundOne(state({ extraCredits: 1 }), 'extra', THURSDAY).extraCredits).toBe(2);
  });

  it('puts a free credit back on the free pool', () => {
    expect(refundOne(state({ freeUsed: 1 }), 'free', THURSDAY).freeUsed).toBe(0);
  });

  it('refunds a weekly credit into an allowance that has since refilled', () => {
    // Spent at 23:59 on Sunday, failed after midnight: the rollover has already
    // zeroed the counter, and the credit is back either way.
    const refunded = refundOne(state({ weekUsed: 1 }), 'weekly', NEXT_MONDAY);
    expect(refunded).toEqual(expect.objectContaining({ week: '2026-W36', weekUsed: 0 }));
  });

  it('keeps what landed on the other pools', () => {
    // The point of refunding a delta: a purchase that synced during the render
    // is in the row this is handed, and has to survive the refund.
    const refunded = refundOne(state({ weekUsed: 6, extraCredits: 3 }), 'weekly', THURSDAY);
    expect(refunded).toEqual(
      expect.objectContaining({ weekUsed: 5, extraCredits: 3, freeUsed: 0 }),
    );
  });
});
