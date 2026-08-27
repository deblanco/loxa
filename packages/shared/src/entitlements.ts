/**
 * What a customer can be.
 *
 * `weekly` is the RevenueCat entitlement's lookup key and the only one that
 * grants an allowance. Everything else — trial included — is a state the app
 * displays, not a permission the Worker checks: a trial *is* the weekly
 * entitlement as far as RevenueCat and this Worker are concerned, which is the
 * point of running the trial through the store instead of through us.
 */
export const WEEKLY_ENTITLEMENT = 'weekly';

export const PLAN_IDS = ['free', 'trial', 'weekly'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/** The App Store product ids. Shared so the paywall and the grant agree. */
export const WEEKLY_PRODUCT_ID = 'loxa_weekly_999';
export const SINGLE_PHOTO_PRODUCT_ID = 'loxa_single_photo_099';
