/**
 * The daily style-ideas notification.
 *
 * One a day, opt-in, and it has to earn the interruption — so it names a look
 * rather than announcing that the app exists. "Try a wolf cut today" is a
 * suggestion; "Come back to Loxa" is a nag.
 *
 * Rotated by day rather than at random so two consecutive days are never the
 * same line, which is what makes a daily notification feel written.
 */
const LINES = [
  { title: 'Curtain bangs, on you', body: 'Two taps to see it before you commit.' },
  { title: 'Going lighter?', body: 'Honey blonde and platinum, on your own photo.' },
  { title: 'The bob is back', body: 'Blunt, chin-length, no layers. Try it on.' },
  { title: 'Copper season', body: 'See how a warm red reads against your skin.' },
  { title: 'Short hair, hypothetically', body: 'A pixie takes ten seconds and no scissors.' },
  { title: 'Beach waves', body: 'Undone, but on purpose. See it on you.' },
  { title: 'A wolf cut, maybe', body: 'Heavy layers, wispy fringe. Worth a look.' },
] as const;

export interface NotificationCopy {
  title: string;
  body: string;
}

export function copyForDay(dayIndex: number): NotificationCopy {
  const line = LINES[((dayIndex % LINES.length) + LINES.length) % LINES.length];
  // The modulo above is total, so this is unreachable — it exists to satisfy
  // noUncheckedIndexedAccess without an assertion.
  return line ?? LINES[0];
}

export const DAILY_LINE_COUNT = LINES.length;
