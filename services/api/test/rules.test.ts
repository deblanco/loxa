import { describe, expect, it } from 'vitest';
import {
  EMPTY_STATE,
  available,
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
    expect(weeklyAllowance('trial')).toBe(20);
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
  it('gives a new free device exactly one', () => {
    expect(available(EMPTY_STATE, 'free', THURSDAY)).toBe(1);
  });

  it('gives a new subscriber twenty plus the free one', () => {
    expect(available(EMPTY_STATE, 'weekly', THURSDAY)).toBe(21);
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
    expect(spent).toEqual(expect.objectContaining({ weekUsed: 1, freeUsed: 0, extraCredits: 1 }));
  });

  it('falls to the free credit when there is no allowance', () => {
    const spent = spendOne(state({ extraCredits: 1 }), 'free', THURSDAY);
    expect(spent).toEqual(expect.objectContaining({ freeUsed: 1, extraCredits: 1 }));
  });

  it('touches a bought credit only when nothing else is left', () => {
    const spent = spendOne(state({ freeUsed: 1, extraCredits: 2 }), 'free', THURSDAY);
    expect(spent?.extraCredits).toBe(1);
  });

  it('returns null with nothing to take', () => {
    expect(spendOne(state({ freeUsed: 1 }), 'free', THURSDAY)).toBeNull();
    expect(spendOne(state({ weekUsed: 20, freeUsed: 1 }), 'weekly', THURSDAY)).toBeNull();
  });

  it('rolls the week before deciding', () => {
    // Out of credits on Sunday, twenty again on Monday, with no separate reset.
    const spent = spendOne(state({ weekUsed: 20, freeUsed: 1 }), 'weekly', NEXT_MONDAY);
    expect(spent).toEqual(expect.objectContaining({ week: '2026-W36', weekUsed: 1 }));
  });
});
