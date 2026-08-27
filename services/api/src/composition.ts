import { d1CreditLedger } from './adapters/d1/credit-ledger';
import { devEntitlements } from './adapters/entitlements/dev';
import { revenueCatEntitlements } from './adapters/entitlements/revenuecat';
import { stubEntitlements } from './adapters/entitlements/stub';
import { kvRenderCache } from './adapters/kv/render-cache';
import { parseServiceAccountKey } from './adapters/vertex/auth';
import { vertexHairRenderer } from './adapters/vertex/hair-renderer';
import type { GetCreditsDeps } from './core/get-credits';
import type { SyncPurchasesDeps } from './core/sync-purchases';
import type { TryOnDeps } from './core/try-on';
import type { Env } from './env';
import type { EntitlementsPort } from './ports/entitlements';

/**
 * The composition root: the only file that knows about both sides of the hexagon.
 *
 * Everything above it is a use case that takes an interface; everything below is
 * an implementation that takes a binding. Wiring lives here so neither has to
 * import the other, and so a test can hand a use case a Map instead of D1.
 */

/**
 * Which entitlements adapter answers, and why in this order.
 *
 * The dev adapter comes first because it is the one a developer is trying to
 * reach, and it can only be reached at all when `DEV_PREMIUM` is set locally
 * *and* the request asked for it. RevenueCat is next. The stub is last and is
 * not a fallback so much as a statement: with no key, nothing can be verified,
 * so nothing is granted.
 */
export function entitlementsFor(env: Env, devPremium: boolean): EntitlementsPort {
  if (env.DEV_PREMIUM === '1' && devPremium) return devEntitlements();

  if (env.REVENUECAT_SECRET_KEY && env.REVENUECAT_PROJECT_ID) {
    return revenueCatEntitlements({
      secretKey: env.REVENUECAT_SECRET_KEY,
      projectId: env.REVENUECAT_PROJECT_ID,
      weeklyEntitlementId: env.REVENUECAT_WEEKLY_ENTITLEMENT_ID,
    });
  }

  return stubEntitlements();
}

export function buildTryOnDeps(env: Env, devPremium: boolean): TryOnDeps {
  return {
    ledger: d1CreditLedger(env.DB),
    entitlements: entitlementsFor(env, devPremium),
    cache: kvRenderCache(env.RESULTS_CACHE),
    renderer: vertexHairRenderer({
      // Throws on a malformed key, here, at composition — which is the loudest
      // available moment. The alternative is finding out inside `crypto.subtle`
      // on somebody's first render, after their credit has been spent.
      credentials: parseServiceAccountKey(env.GOOGLE_SA_KEY),
      projectId: env.GOOGLE_PROJECT_ID,
      model: env.IMAGE_MODEL,
    }),
    now: () => new Date(),
  };
}

export function buildCreditsDeps(env: Env, devPremium: boolean): GetCreditsDeps {
  return {
    ledger: d1CreditLedger(env.DB),
    entitlements: entitlementsFor(env, devPremium),
    now: () => new Date(),
  };
}

export function buildSyncDeps(env: Env, devPremium: boolean): SyncPurchasesDeps {
  return {
    ledger: d1CreditLedger(env.DB),
    entitlements: entitlementsFor(env, devPremium),
    now: () => new Date(),
  };
}
