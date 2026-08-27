/**
 * Credits: how many, and when they go away.
 *
 * A credit is one generated photo. Subscribers get an allowance that refills
 * every Monday and does not roll over; everyone else gets one on the house and
 * then pays per photo.
 *
 * The Worker and the app both need the same answer to "which week is it" — one
 * to reset the counter, the other to print "resets Monday" — so the week
 * arithmetic lives here rather than in either of them.
 */

/** The weekly subscription's allowance. $9.99 for 20 photos. */
export const WEEKLY_CREDITS = 20;

/**
 * What "Continue free" is worth: one photo, ever.
 *
 * Not a weekly free credit. A free tier that refills is a free tier someone
 * farms, and the model call is the most expensive thing this product does.
 */
export const FREE_CREDITS = 1;

/** Days of trial before the first charge. */
export const TRIAL_DAYS = 3;

export const WEEKLY_PRICE_LABEL = '$9.99/week';
export const SINGLE_PHOTO_PRICE_LABEL = '$0.99';

/**
 * The ISO-8601 week a date falls in, as `YYYY-Www`.
 *
 * ISO weeks start on Monday and belong to the year containing their Thursday,
 * which is why this pivots to Thursday before reading the year: 2027-01-01 is a
 * Friday, and the week it sits in is 2026-W53, not 2027-W01. Getting that wrong
 * hands somebody a second allowance at new year.
 *
 * UTC throughout. A device in Auckland and the Worker in Frankfurt have to
 * agree on the string or the reset lands twice.
 */
export function isoWeek(date: Date): string {
  const pivot = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  // getUTCDay is 0 for Sunday; ISO calls Sunday 7. Shift to the Thursday of
  // this week: that is the day whose year names the week.
  const isoDay = pivot.getUTCDay() === 0 ? 7 : pivot.getUTCDay();
  pivot.setUTCDate(pivot.getUTCDate() + 4 - isoDay);

  const year = pivot.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstIsoDay = firstThursday.getUTCDay() === 0 ? 7 : firstThursday.getUTCDay();
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstIsoDay);

  const week = Math.round((pivot.getTime() - firstThursday.getTime()) / (7 * 86_400_000)) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Midnight UTC on the Monday that ends this week.
 *
 * What the profile screen means by "resets Monday". Monday itself resets on the
 * *following* Monday — a subscriber who buys on Monday morning gets the whole
 * week, not the rest of the day.
 */
export function nextWeeklyReset(now: Date): Date {
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const isoDay = midnight.getUTCDay() === 0 ? 7 : midnight.getUTCDay();
  midnight.setUTCDate(midnight.getUTCDate() + (8 - isoDay));
  return midnight;
}
