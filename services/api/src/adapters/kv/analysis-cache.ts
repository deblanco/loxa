import type { AnalysisCachePort } from '../../ports/analysis-cache';

/**
 * Seven days, against the render cache's thirty.
 *
 * What is stored here is prose about somebody's face rather than a picture they
 * already have on their phone, and it comes from a model that will be retuned:
 * a stale sentence about a jawline ages worse than a stale photograph. Seven
 * days is long enough that asking the same thing twice in a week is free, which
 * is the only reason this cache exists — the route spends no credit, so a hit
 * saves a model call rather than a charge.
 */
const TTL_SECONDS = 7 * 24 * 60 * 60;

export function kvAnalysisCache(namespace: KVNamespace): AnalysisCachePort {
  return {
    async get(key) {
      return await namespace.get(key, 'text');
    },

    async put(key, json) {
      await namespace.put(key, json, { expirationTtl: TTL_SECONDS });
    },
  };
}
