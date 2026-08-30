/**
 * The daily style-ideas notification.
 *
 * One a day, opt-in, and it has to earn the interruption — so it names a look
 * rather than announcing that the app exists. "Try a wolf cut today" is a
 * suggestion; "Come back to Loxa" is a nag. The lines themselves are in
 * `src/i18n/locales/`, one set per language.
 *
 * Rotated by day rather than at random so two consecutive days are never the
 * same line, which is what makes a daily notification feel written.
 */

/**
 * Which line, as the pair of keys that renders it.
 *
 * Written out rather than built from a template so the keys are literals and
 * i18next's typed `t` can check them, which is the whole reason a missing
 * notification string fails at `tsc` rather than at 18:30.
 */
const LINES = [
  { title: 'notifications.line1.title', body: 'notifications.line1.body' },
  { title: 'notifications.line2.title', body: 'notifications.line2.body' },
  { title: 'notifications.line3.title', body: 'notifications.line3.body' },
  { title: 'notifications.line4.title', body: 'notifications.line4.body' },
  { title: 'notifications.line5.title', body: 'notifications.line5.body' },
  { title: 'notifications.line6.title', body: 'notifications.line6.body' },
  { title: 'notifications.line7.title', body: 'notifications.line7.body' },
] as const;

export type NotificationCopy = (typeof LINES)[number];

export function copyForDay(dayIndex: number): NotificationCopy {
  const line = LINES[((dayIndex % LINES.length) + LINES.length) % LINES.length];
  // The modulo above is total, so this is unreachable — it exists to satisfy
  // noUncheckedIndexedAccess without an assertion.
  return line ?? LINES[0];
}

export const DAILY_LINE_COUNT = LINES.length;
