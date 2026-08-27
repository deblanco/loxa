/**
 * The strings the design system asks for, in one place.
 *
 * Copy lives here rather than inline so it can be tested and so the same phrase
 * cannot drift between two screens — "resets Monday" appears on the profile and
 * in the paywall and has to be the same sentence in both.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When the allowance comes back, in the profile card's voice.
 *
 * Always a weekday name rather than a date, because the reset is always a
 * Monday and "resets Monday" is a thing a person can hold in their head where
 * "resets 31/08" is not.
 */
export function resetLabel(resetsAt: string, now: Date): string {
  const reset = new Date(resetsAt);
  const days = Math.ceil((reset.getTime() - now.getTime()) / DAY_MS);

  if (days <= 1) return 'resets tomorrow';
  return 'resets Monday';
}

/** The credit chip: a bare number, because the dot beside it says what it is. */
export function creditChipLabel(creditsLeft: number): string {
  return String(creditsLeft);
}

/** The plan row's title. */
export function planLabel(plan: 'free' | 'trial' | 'weekly'): string {
  if (plan === 'weekly') return 'Loxa Weekly';
  if (plan === 'trial') return 'Free trial';
  return 'Free plan';
}
