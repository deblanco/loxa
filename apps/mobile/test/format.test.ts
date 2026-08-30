import { describe, expect, it } from 'vitest';
import { creditChipLabel, planLabel, resetLabel } from '../src/format';

describe('resetLabel', () => {
  it('names the day when it is further out', () => {
    expect(resetLabel('2026-08-31T00:00:00.000Z', new Date('2026-08-27T12:00:00Z'))).toBe(
      'profile.resetsMonday',
    );
  });

  it('says tomorrow when it is tomorrow', () => {
    expect(resetLabel('2026-08-31T00:00:00.000Z', new Date('2026-08-30T12:00:00Z'))).toBe(
      'profile.resetsTomorrow',
    );
  });
});

describe('creditChipLabel', () => {
  it('is a bare number, because the dot beside it says what it is', () => {
    expect(creditChipLabel(13)).toBe('13');
    expect(creditChipLabel(0)).toBe('0');
  });
});

describe('planLabel', () => {
  it('names each plan', () => {
    expect(planLabel('weekly')).toBe('profile.planWeekly');
    expect(planLabel('trial')).toBe('profile.planTrial');
    expect(planLabel('free')).toBe('profile.planFree');
  });
});
