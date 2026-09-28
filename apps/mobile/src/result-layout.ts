import { space } from './theme';

/**
 * The result screen's bottom-anchored stack, as arithmetic.
 *
 * Everything on that screen is measured up from the bottom edge: the Share /
 * Again block, then the portrait offer when there is one, then the caption
 * with its "hold to compare" pill. Each row rests on the one below it plus
 * `space.s3`. The caption used to sit at a fixed 96 from the prototype, lower
 * than the actions block is tall, so Share was drawn over the compare pill and
 * took every press — the one control that shows the original photo could not
 * be reached. Deriving it from `ACTIONS_HEIGHT` keeps the two from drifting
 * apart again.
 */

/** The Share / Again block: `space.s5` of clearance, two pills and the gap. */
export const ACTIONS_HEIGHT = space.s5 + 56 + (space.s2 + 2) + 46;

/**
 * Where the caption's bottom edge sits, above the safe area. The caption gets
 * out of the offer card's way rather than the card squeezing in under it, so
 * the offer's measured height pushes it up.
 */
export function captionBottom(offerHeight: number | null): number {
  const aboveActions = ACTIONS_HEIGHT + space.s3;
  return offerHeight === null ? aboveActions : aboveActions + offerHeight + space.s3;
}
