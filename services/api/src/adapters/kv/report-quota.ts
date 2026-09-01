import type { ReportQuotaPort } from '../../ports/report-quota';

/**
 * The diagnostics rate limit, on the results-cache namespace.
 *
 * One namespace for this Worker, key-prefixed by feature — `tryon:` is the
 * render cache, `diag:` is this. A second namespace would be a second thing to
 * create, name and lose, for a counter that expires by itself.
 */

/** Namespaced so a quota key can never collide with a cached render. */
const PREFIX = 'diag:';

/**
 * Two days, against a key that names one day.
 *
 * The key rolls at UTC midnight, so the extra day is only there to let the
 * previous day's counter fall out on its own rather than lingering. Nothing
 * reads a counter after its day is over.
 */
const TTL_SECONDS = 2 * 24 * 60 * 60;

export function kvReportQuota(namespace: KVNamespace): ReportQuotaPort {
  return {
    async consume(deviceId, wanted, limit, at) {
      // UTC, not the phone's day. The device that reports errors is exactly the
      // device whose clock and timezone cannot be trusted, and a limit that
      // resets when the user flies somewhere is not a limit.
      const day = at.toISOString().slice(0, 10);
      const key = `${PREFIX}${deviceId}:${day}`;

      const raw = await namespace.get(key, 'text');
      const used = Number(raw);
      // A missing key and a corrupted one are the same thing: nothing spent.
      const spent = Number.isFinite(used) && used > 0 ? used : 0;

      const granted = Math.max(0, Math.min(wanted, limit - spent));
      if (granted === 0) return 0;

      await namespace.put(key, String(spent + granted), { expirationTtl: TTL_SECONDS });
      return granted;
    },
  };
}
