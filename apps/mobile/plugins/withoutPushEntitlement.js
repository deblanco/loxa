const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Take the push entitlement back out.
 *
 * `expo-notifications` adds `aps-environment` to the entitlements as soon as it
 * is installed, whether or not anything registers for push. This app schedules
 * *local* notifications only — one a day, written on the phone, no token, no
 * server, nothing sent from us (see `src/notifications` and the privacy page).
 * Local notifications need no entitlement, so the key is a capability the binary
 * claims and never uses: it makes the App ID carry Push Notifications for no
 * reason, and a reviewer reading the entitlements would reasonably ask what
 * pushes.
 *
 * Applied to every profile, unlike `withoutDevNetworking`: a dev client does not
 * push either, so there is no local case to preserve.
 */
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
