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

/**
 * Three destinations, best first.
 *
 * 1. **RevenueCat's Customer Center**, a sheet inside the app showing the
 *    active plan with restore, change plan, cancel and refund on it. This is
 *    what "Manage" should open: leaving the app to a list that may not even
 *    mention us is a worse answer to "what am I paying for".
 * 2. **The store's own management URL**, which is where *this* subscription
 *    actually lives — including a sandbox one, which is not on the production
 *    list at all.
 * 3. **Apple's generic page**, which is what this did unconditionally before.
 *
 * Each step down is a real degradation and none of them is a dead end, which
 * matters: 3.1.2 wants a functional link, and a Manage button that does nothing
 * because a dashboard was misconfigured is worse than one that opens the wrong
 * list.
 */
export async function openManageSubscriptions(): Promise<void> {
  const store = purchases();

  if (await store.presentCustomerCenter().catch(() => false)) return;

  // Null whenever there is no active subscription, which includes the case the
  // profile already guards against by sending a free reader to the paywall.
  const url = await store.managementUrl().catch(() => null);

  void Linking.openURL(url ?? MANAGE_URL);
}
