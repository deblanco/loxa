import type { EntitlementsPort } from '../../ports/entitlements';

/**
 * Nobody is a subscriber, and nothing was purchased.
 *
 * What a deployment with no RevenueCat key gets. Not a convenience: it is the
 * honest answer to "can you verify this purchase", and the alternative — assume
 * yes — is how a paywall quietly becomes free image generation. Every device on
 * a stubbed deployment still gets its one free credit, so the app is usable and
 * visibly not selling anything.
 */
export function stubEntitlements(): EntitlementsPort {
  return {
    async planFor() {
      return 'free';
    },
    async verifyPurchase() {
      return false;
    },
  };
}
