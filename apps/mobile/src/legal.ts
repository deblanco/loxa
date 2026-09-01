import { Linking } from 'react-native';
import { reportHandled } from './diagnostics';

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

/**
 * Opened, and the rejection caught.
 *
 * `Linking.openURL` rejects rather than throwing, and a bare `void` on it made
 * that an unhandled rejection: eight of them arrived from one device inside two
 * minutes — both URLs, from the profile and from the paywall — and then never
 * again. Whatever iOS was refusing at that moment, the app could not say which
 * link it had been, because an unhandled rejection carries no context of ours.
 *
 * Nothing about the working case changes. This is the failing case becoming
 * legible: these are the links App Review requires at every point of purchase,
 * so a silent failure to open one is not a small thing.
 */
function open(url: string, context: string): void {
  Linking.openURL(url).catch((err: unknown) => reportHandled(err, context));
}

export function openPrivacy(): void {
  open(LEGAL_URLS.privacy, 'legal.privacy');
}

export function openTerms(): void {
  open(LEGAL_URLS.terms, 'legal.terms');
}
