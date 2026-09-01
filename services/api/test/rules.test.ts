import { describe, expect, it } from 'vitest';
import {
  EMPTY_STATE,
  available,
  refundOne,
  rollForward,
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
    expect(spendOne(state({ weekUsed: 20, freeUsed: 1 }), 'weekly', THURSDAY)).toBeNull();
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
