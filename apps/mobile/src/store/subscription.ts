import { Linking } from 'react-native';
import { purchases } from '@/purchases';

/**
 * The App Store's own subscription settings.
 *
 * Apple owns the subscription, not us: cancelling, changing the renewal date
 * and seeing what was charged all happen in Settings, and there is no API that
 * lets an app do any of it. What an app *must* do is provide the way there —
 * guideline 3.1.2 requires a functional link to manage the subscription, and a
 * "Manage" button that opened our own paywall would be a button a subscriber
 * cannot use to unsubscribe. Which is the one thing they came looking for.
 *
 * The `https` form rather than `itms-apps://`: both open the same sheet, but
 * the universal link survives a phone where the App Store has been restricted,
 * landing on the web page instead of failing to open at all.
 *
 * This is the *fallback*, not the destination. It is the production
 * subscriptions list, and a sandbox subscription is not on it — every
 * TestFlight purchase is a sandbox purchase, so a tester pressing Manage was
 * sent to a page that correctly showed them nothing of ours. The store knows
 * where a given subscription actually lives; `managementUrl` is it asking.
 */
const MANAGE_URL = 'https://apps.apple.com/account/subscriptions';

export async function openManageSubscriptions(): Promise<void> {
  // Null whenever there is no active subscription, which includes the case the
  // profile already guards against by sending a free reader to the paywall
  // instead. The fallback is what this function did unconditionally before.
  const url = await purchases()
    .managementUrl()
    .catch(() => null);

  void Linking.openURL(url ?? MANAGE_URL);
}
