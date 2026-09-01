const { withInfoPlist } = require('expo/config-plugins');

/**
 * Take Expo Dev Launcher's networking back out of a build that is not a dev
 * client.
 *
 * `expo-dev-client` is an ordinary dependency, and EAS installs devDependencies
 * too, so its config plugin runs on every prebuild — including the ones that go
 * to TestFlight and the App Store. It leaves three keys behind:
 *
 * - `NSLocalNetworkUsageDescription`, whose text names Expo Dev Launcher and
 *   development servers, neither of which exists in a release binary. iOS shows
 *   that sentence verbatim if the prompt ever fires.
 * - `NSBonjourServices: _expo._tcp`, the Metro discovery service.
 * - `NSAllowsLocalNetworking`, an ATS exception the app has no use for once
 *   `EXPO_PUBLIC_API_URL` is an https host.
 *
 * None of it is reachable in release — Dev Launcher is not linked, so nothing
 * asks for the local network and the prompt never appears. It is removed
 * because the binary should not carry a permission string for a tool it does
 * not contain, not because App Review would catch it.
 *
 * **Guarded on the profile being known and not `development`.** A local
 * `expo prebuild` or `expo run:ios` sets no `EAS_BUILD_PROFILE`, and stripping
 * these there would leave the dev client unable to find Metro over the network
 * — which is the whole reason the keys exist. Absent means "somebody's laptop",
 * and a laptop keeps them.
 *
 * The `exp+loxa` URL scheme is left alone deliberately. It is dead weight in
 * release too, but a scheme prompts nobody and relaxes nothing, and the `loxa`
 * scheme beside it is the one expo-router actually links on.
 */
module.exports = function withoutDevNetworking(config) {
  const profile = process.env.EAS_BUILD_PROFILE;
  if (!profile || profile === 'development') return config;

  return withInfoPlist(config, (config) => {
    delete config.modResults.NSLocalNetworkUsageDescription;
    delete config.modResults.NSBonjourServices;

    const ats = config.modResults.NSAppTransportSecurity;
    if (ats && typeof ats === 'object') delete ats.NSAllowsLocalNetworking;

    return config;
  });
};
