/**
 * The strings the design system asks for, in one place.
 *
 * These return translation *keys* rather than sentences, which is what keeps
 * the rules here and the words in `src/i18n/locales/`. The point is unchanged:
 * the same phrase cannot drift between two screens, because both screens ask
 * this file which key to render.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When the allowance comes back, in the profile card's voice.
 *
 * Always a weekday name rather than a date, because the reset is always a
 * Monday and "resets Monday" is a thing a person can hold in their head where
 * "resets 31/08" is not.
 */
export function resetLabel(
  resetsAt: string,
  now: Date,
): 'profile.resetsTomorrow' | 'profile.resetsMonday' {
  const reset = new Date(resetsAt);
  const days = Math.ceil((reset.getTime() - now.getTime()) / DAY_MS);

  if (days <= 1) return 'profile.resetsTomorrow';
  return 'profile.resetsMonday';
}

/**
 * The out-of-credits sheet's second line.
 *
 * The same decision as `resetLabel` in a different sentence, rather than a
 * second rule: the sheet used to say "until Monday." on a Sunday night, when
 * the answer was tomorrow.
 */
export function paywallResetLabel(
  resetsAt: string,
  now: Date,
): 'paywall.untilTomorrow' | 'paywall.untilMonday' {
  return resetLabel(resetsAt, now) === 'profile.resetsTomorrow'
    ? 'paywall.untilTomorrow'
    : 'paywall.untilMonday';
}

/** The credit chip: a bare number, because the dot beside it says what it is. */
export function creditChipLabel(creditsLeft: number): string {
  return String(creditsLeft);
}

/** The plan row's title. */
export function planLabel(
  plan: 'free' | 'weekly',
): 'profile.planWeekly' | 'profile.planFree' {
  if (plan === 'weekly') return 'profile.planWeekly';
  return 'profile.planFree';
}
