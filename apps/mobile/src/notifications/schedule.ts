/**
 * When the daily notification fires.
 *
 * 18:30 local: after the working day, before the evening is committed — the
 * hour somebody might actually stop and try a haircut on. Not the morning,
 * which is a bad time to be told about your hair.
 */
export const DAILY_HOUR = 18;
export const DAILY_MINUTE = 30;

/** How many days out to schedule, since iOS wants concrete triggers. */
export const SCHEDULED_DAYS = 7;

/**
 * When the queue has run low enough to write another week.
 *
 * iOS wants concrete dates, so "one a day" is a week of them written in advance
 * and it stops on its own when they are spent. Topping up before it is empty,
 * rather than after, means nobody has a day with nothing on it in between.
 */
export const TOP_UP_BELOW = 3;

export function needsTopUp(queued: number): boolean {
  return queued < TOP_UP_BELOW;
}

export interface ScheduledNotification {
  dayIndex: number;
  fireAt: Date;
}

/**
 * The next week of notifications, one a day.
 *
 * Starts tomorrow when today's slot has already passed, so enabling the toggle
 * at 8pm does not fire something a moment later — which reads as a bug and is
 * the fastest way to have the permission revoked.
 */
export function scheduleFrom(now: Date): ScheduledNotification[] {
  const first = new Date(now);
  first.setHours(DAILY_HOUR, DAILY_MINUTE, 0, 0);
  if (first.getTime() <= now.getTime()) first.setDate(first.getDate() + 1);

  return Array.from({ length: SCHEDULED_DAYS }, (_, i) => {
    const fireAt = new Date(first);
    fireAt.setDate(first.getDate() + i);
    // Day-of-year, so the copy keeps rotating across a re-schedule rather than
    // restarting at the same line every time the toggle is flipped.
    return { dayIndex: dayOfYear(fireAt), fireAt };
  });
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

/**
 * The hour a notification fires, written the way the reader writes it.
 *
 * `Intl` rather than a format string, because 18:30 is "6:30 PM" in English and
 * "18:30" in the other four, and a hand-built string would be right in one.
 * Takes the language the *app* speaks, not the phone's region: somebody who
 * chose English on a German phone meant it, exactly as `resolveLanguage` says.
 */
export function formatFireTime(fireAt: Date, language: string): string {
  return new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit' }).format(fireAt);
}
