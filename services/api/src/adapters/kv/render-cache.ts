import type { RenderCachePort } from '../../ports/render-cache';

/**
 * Thirty days.
 *
 * Long enough that pressing "Again" a week later is still free, short enough
 * that KV is not a photo album — the app writes every result to the device's
 * own filesystem, so this expiring is a re-render at worst, never a lost
 * picture. It also means somebody's face leaves our storage on a timer without
 * anyone having to remember to delete it.
 */
const TTL_SECONDS = 30 * 24 * 60 * 60;

export function kvRenderCache(namespace: KVNamespace): RenderCachePort {
  return {
    async get(key) {
      return await namespace.get(key, 'text');
    },

    async put(key, imageBase64) {
      await namespace.put(key, imageBase64, { expirationTtl: TTL_SECONDS });
    },
  };
}
