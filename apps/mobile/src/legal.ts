import { Linking } from 'react-native';

/**
 * The legal pages, in one place.
 *
 * They live at `loxa.blankhexadecimal.com` — the same Next.js site as the
 * landing page, deployed to Cloudflare Workers from `apps/web`. Both URLs also
 * go into App Store Connect, so a change here is a change in three places and
 * should be made deliberately.
 *
 * Centralised because App Store review requires them reachable from **every**
 * point of purchase, not just from settings (guideline 3.1.2). That means the
 * onboarding offer, the out-of-credits sheet, and the profile — and three
 * hardcoded copies of a domain is three chances to update two of them.
 */
const SITE = 'https://loxa.blankhexadecimal.com';

export const LEGAL_URLS = {
  privacy: `${SITE}/privacy-policy`,
  terms: `${SITE}/terms`,
} as const;

export function openPrivacy(): void {
  void Linking.openURL(LEGAL_URLS.privacy);
}

export function openTerms(): void {
  void Linking.openURL(LEGAL_URLS.terms);
}
