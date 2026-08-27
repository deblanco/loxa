import { describe, expect, it } from 'vitest';
import { isoWeek, nextWeeklyReset } from '../src/credits';

describe('isoWeek', () => {
  it('numbers a mid-year week', () => {
    // 2026-08-27 is a Thursday in ISO week 35.
    expect(isoWeek(new Date('2026-08-27T12:00:00Z'))).toBe('2026-W35');
  });

  it('holds the same string across a whole Monday-to-Sunday week', () => {
    const monday = isoWeek(new Date('2026-08-24T00:00:00Z'));
    const sunday = isoWeek(new Date('2026-08-30T23:59:59Z'));
    expect(monday).toBe('2026-W35');
    expect(sunday).toBe('2026-W35');
  });

  it('rolls over on Monday, not on Sunday', () => {
    expect(isoWeek(new Date('2026-08-30T23:59:59Z'))).toBe('2026-W35');
    expect(isoWeek(new Date('2026-08-31T00:00:00Z'))).toBe('2026-W36');
  });

  it('keeps early January in the previous year when the week belongs there', () => {
    // 2027-01-01 is a Friday; its week's Thursday is 2026-12-31, so the week is
    // 2026-W53. Reading the calendar year here would hand out a free allowance.
    expect(isoWeek(new Date('2027-01-01T00:00:00Z'))).toBe('2026-W53');
    expect(isoWeek(new Date('2027-01-04T00:00:00Z'))).toBe('2027-W01');
  });

  it('pads a single-digit week', () => {
    expect(isoWeek(new Date('2026-01-08T00:00:00Z'))).toBe('2026-W02');
  });

  it('reads the day in UTC, not locally', () => {
    // Late Sunday UTC is already Monday in Auckland. The week must not move.
    expect(isoWeek(new Date('2026-08-30T22:00:00Z'))).toBe('2026-W35');
  });
});

describe('nextWeeklyReset', () => {
  it('points at the coming Monday midnight', () => {
    expect(nextWeeklyReset(new Date('2026-08-27T09:30:00Z')).toISOString()).toBe(
      '2026-08-31T00:00:00.000Z',
    );
  });

  it('gives a Monday buyer the whole week, not the rest of the day', () => {
    expect(nextWeeklyReset(new Date('2026-08-31T08:00:00Z')).toISOString()).toBe(
      '2026-09-07T00:00:00.000Z',
    );
  });

  it('moves off Sunday to the very next day', () => {
    expect(nextWeeklyReset(new Date('2026-08-30T23:00:00Z')).toISOString()).toBe(
      '2026-08-31T00:00:00.000Z',
    );
  });

  it('crosses a month boundary', () => {
    expect(nextWeeklyReset(new Date('2026-09-30T12:00:00Z')).toISOString()).toBe(
      '2026-10-05T00:00:00.000Z',
    );
  });
});
