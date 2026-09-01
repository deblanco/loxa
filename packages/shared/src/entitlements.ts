/**
 * What a customer can be.
 *
 * `loxa_pro` is the RevenueCat entitlement's lookup key and the only one that
 * grants an allowance. Everything else is a state the app displays, not a
 * permission the Worker checks: an introductory first week *is* the weekly
 * entitlement as far as RevenueCat and this Worker are concerned, which is the
 * point of running the offer through the store instead of through us.
 *
 * `trial` is a leftover. There is no free trial — the App Store's one
 * introductory offer per subscription is spent on the $0.99 first week — and
 * `planFor` has only ever returned `weekly` or `free`. It stays in the union
 * because `plan` is a response field with clients in the wild reading it.
 */
export const WEEKLY_ENTITLEMENT = 'loxa_pro';

export const PLAN_IDS = ['free', 'weekly'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/**
 * The store product ids. Shared so the paywall and the grant agree.
 *
 * These are the identifiers as they are spelled in RevenueCat, not guesses: a
 * product id the store does not know returns no product, and `buyWeekly` then
 * quietly returns false with no sheet and nothing to explain it.
 */
export const WEEKLY_PRODUCT_ID = 'loxa_weekly_999';
export const SINGLE_PHOTO_PRODUCT_ID = 'loxa_single_photo_099';
