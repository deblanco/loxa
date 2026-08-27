import type { EntitlementsPort } from '../../ports/entitlements';

/**
 * The subscriber a developer can be by asking.
 *
 * Only reachable when `DEV_PREMIUM` is set in `.dev.vars` *and* the request
 * carries `X-Dev-Premium`. Both halves are needed on purpose: the var never
 * exists in production, and the header never ships in a release build, so
 * neither one alone opens anything.
 *
 * Purchases still do not verify. Granting a real credit for an imaginary
 * transaction would write a row to `credit_grant` that outlives the switch.
 */
export function devEntitlements(): EntitlementsPort {
  return {
    async planFor() {
      return 'weekly';
    },
    async verifyPurchase() {
      return false;
    },
  };
}
