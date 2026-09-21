import { describe, expect, it } from 'vitest';
import { DAILY_LINE_COUNT, copyForDay } from '../src/notifications/copy';
import {
  DAILY_HOUR,
  DAILY_MINUTE,
  SCHEDULED_DAYS,
  TOP_UP_BELOW,
  formatFireTime,
  needsTopUp,
  scheduleFrom,
} from '../src/notifications/schedule';
import en from '../src/i18n/locales/en';

/**
 * The lines themselves moved to the locales, and what they say — a look rather
 * than the app's name — is asserted there in all five languages. What is left
 * here is the rotation, which is what this file was always about.
 */
describe('copyForDay', () => {
  it('names a key that has copy behind it, in every language', () => {
    // A key with no string behind it arrives at 18:30 as the literal text
    // `notifications.line4.title`.
    const lines = new Set(Object.keys(en.notifications));
    for (let day = 0; day < DAILY_LINE_COUNT; day += 1) {
      const { title, body } = copyForDay(day);
      expect(lines.has(title.split('.')[1]!)).toBe(true);
      expect(lines.has(body.split('.')[1]!)).toBe(true);
    }
  });

  it('never repeats on two consecutive days', () => {
    for (let day = 0; day < DAILY_LINE_COUNT * 2; day += 1) {
      expect(copyForDay(day).title).not.toBe(copyForDay(day + 1).title);
    }
  });

  it('wraps rather than running out', () => {
    expect(copyForDay(DAILY_LINE_COUNT)).toEqual(copyForDay(0));
    expect(copyForDay(DAILY_LINE_COUNT * 5 + 3)).toEqual(copyForDay(3));
  });

  it('survives a negative day index', () => {
    expect(copyForDay(-1)).toBeDefined();
  });
});

describe('scheduleFrom', () => {
  it('schedules a week', () => {
    expect(scheduleFrom(new Date('2026-08-27T09:00:00'))).toHaveLength(SCHEDULED_DAYS);
  });

  it('fires this evening when the slot has not passed', () => {
    const [first] = scheduleFrom(new Date('2026-08-27T09:00:00'));
    expect(first?.fireAt.getDate()).toBe(27);
    expect(first?.fireAt.getHours()).toBe(DAILY_HOUR);
    expect(first?.fireAt.getMinutes()).toBe(DAILY_MINUTE);
  });

  it('waits for tomorrow when the slot has already gone', () => {
    // Enabling the toggle at 8pm must not fire something a moment later — that
    // reads as a bug and is the fastest way to have the permission revoked.
    const [first] = scheduleFrom(new Date('2026-08-27T20:00:00'));
    expect(first?.fireAt.getDate()).toBe(28);
  });

  it('spaces them exactly a day apart', () => {
    const scheduled = scheduleFrom(new Date('2026-08-27T09:00:00'));
    for (let i = 1; i < scheduled.length; i += 1) {
      const gap = scheduled[i]!.fireAt.getTime() - scheduled[i - 1]!.fireAt.getTime();
      expect(gap).toBe(24 * 60 * 60 * 1000);
    }
  });

  it('gives each day a different line', () => {
    const scheduled = scheduleFrom(new Date('2026-08-27T09:00:00'));
    const titles = scheduled.map((s) => copyTitle(s.dayIndex));
    expect(new Set(titles).size).toBe(Math.min(SCHEDULED_DAYS, DAILY_LINE_COUNT));
  });

  it('crosses a month boundary', () => {
    const scheduled = scheduleFrom(new Date('2026-08-30T09:00:00'));
    expect(scheduled.at(-1)?.fireAt.getMonth()).toBe(8); // September
  });
});

function copyTitle(dayIndex: number): string {
  return copyForDay(dayIndex).title;
}

describe('formatFireTime', () => {
  const evening = new Date(2026, 8, 21, DAILY_HOUR, DAILY_MINUTE);

  it('writes the hour the way each language does', () => {
    // English is a twelve-hour clock and the rest are not; a hand-built string
    // would be right in one of them. Matched loosely because the space before
    // "PM" is a narrow no-break one in current ICU and something else in older.
    expect(formatFireTime(evening, 'en')).toMatch(/^6:30\s?PM$/i);
    for (const language of ['es', 'fr', 'de', 'it']) {
      expect(formatFireTime(evening, language)).toBe('18:30');
    }
  });
});

describe('needsTopUp', () => {
  it('writes another week before the last one runs out, not after', () => {
    // One a day is a week of dates written in advance. Waiting for zero leaves a
    // day with nothing on it between the last one firing and the app next being
    // opened.
    expect(needsTopUp(0)).toBe(true);
    expect(needsTopUp(TOP_UP_BELOW - 1)).toBe(true);
    expect(needsTopUp(TOP_UP_BELOW)).toBe(false);
    expect(needsTopUp(SCHEDULED_DAYS)).toBe(false);
  });
});
