import { d1CreditLedger } from './adapters/d1/credit-ledger';
import { d1Diagnostics } from './adapters/d1/diagnostics';
import { d1UsageStats } from './adapters/d1/usage-stats';
import { devEntitlements } from './adapters/entitlements/dev';
import { fallbackRenderer } from './adapters/fallback-renderer';
import { revenueCatEntitlements } from './adapters/entitlements/revenuecat';
import { stubEntitlements } from './adapters/entitlements/stub';
import { kvRenderCache } from './adapters/kv/render-cache';
import { kvReportQuota } from './adapters/kv/report-quota';
import { openRouterHairRenderer } from './adapters/openrouter/hair-renderer';
import { parseServiceAccountKey } from './adapters/vertex/auth';
import { vertexHairRenderer } from './adapters/vertex/hair-renderer';
import type { GetCreditsDeps } from './core/get-credits';
import type { ReportDiagnosticsDeps } from './core/report-diagnostics';
import type { SyncPurchasesDeps } from './core/sync-purchases';
import type { TryOnDeps } from './core/try-on';
import type { Env } from './env';
import type { EntitlementsPort } from './ports/entitlements';
import type { HairRendererPort } from './ports/hair-renderer';

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

/**
 * Which renderer answers, and this one *is* a fallback chain.
 *
 * Vertex is always the primary: it is the direct relationship, and it is the
 * cheaper of the two by whatever OpenRouter's margin turns out to be. OpenRouter
 * is asked only when Vertex is rate-limited, down, or unreachable — see
 * `adapters/fallback-renderer.ts` for why nothing else falls through.
 *
 * With no OpenRouter key this returns the bare Vertex adapter and the behaviour
 * is exactly what it was before there was a second provider. That is a
 * supported state, not a degraded one: unlike the entitlements stub, a missing
 * key here costs availability rather than correctness.
 */
export function rendererFor(env: Env): HairRendererPort {
  const vertex = vertexHairRenderer({
    // Throws on a malformed key, here, at composition — which is the loudest
    // available moment. The alternative is finding out inside `crypto.subtle`
    // on somebody's first render, after their credit has been spent.
    credentials: parseServiceAccountKey(env.GOOGLE_SA_KEY),
    projectId: env.GOOGLE_PROJECT_ID,
    model: env.IMAGE_MODEL,
  });

  if (!env.OPENROUTER_API_KEY || !env.OPENROUTER_IMAGE_MODEL) return vertex;

  return fallbackRenderer(
    vertex,
    openRouterHairRenderer({
      apiKey: env.OPENROUTER_API_KEY,
      model: env.OPENROUTER_IMAGE_MODEL,
    }),
  );
}

export function buildTryOnDeps(env: Env, devPremium: boolean): TryOnDeps {
  return {
    ledger: d1CreditLedger(env.DB),
    entitlements: entitlementsFor(env, devPremium),
    cache: kvRenderCache(env.RESULTS_CACHE),
    renderer: rendererFor(env),
    // Same database as the ledger, and deliberately: `style_use` is 240 rows
    // that never grow with traffic, and a second store would be a second thing
    // to provision, keep in step and lose.
    stats: d1UsageStats(env.DB),
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

/**
 * The diagnostics sink.
 *
 * No entitlements and no ledger: reporting a failure is not a metered act, so
 * there is nothing here to check and nothing to spend. The two bindings are the
 * table the reports land in and the namespace that holds the rate limit.
 */
export function buildDiagnosticsDeps(env: Env): ReportDiagnosticsDeps {
  return {
    diagnostics: d1Diagnostics(env.DB),
    // The same namespace as the render cache, key-prefixed `diag:`. See
    // `adapters/kv/report-quota.ts`.
    quota: kvReportQuota(env.RESULTS_CACHE),
    now: () => new Date(),
  };
}
