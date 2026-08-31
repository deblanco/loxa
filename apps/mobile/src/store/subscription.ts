import { Linking } from 'react-native';

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
 */
const MANAGE_URL = 'https://apps.apple.com/account/subscriptions';

export function openManageSubscriptions(): void {
  void Linking.openURL(MANAGE_URL);
}
