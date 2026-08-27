import { describe, expect, it } from 'vitest';
import { DAILY_LINE_COUNT, copyForDay } from '../src/notifications/copy';
import { DAILY_HOUR, DAILY_MINUTE, SCHEDULED_DAYS, scheduleFrom } from '../src/notifications/schedule';

describe('copyForDay', () => {
  it('names a look rather than the app', () => {
    // "Come back to Loxa" is a nag; "Try a wolf cut today" is a suggestion. The
    // difference is whether the notification earns the interruption.
    for (let day = 0; day < DAILY_LINE_COUNT; day += 1) {
      expect(copyForDay(day).title).not.toMatch(/loxa/i);
      expect(copyForDay(day).body.length).toBeGreaterThan(10);
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
