import type { ReportQuotaPort } from '../../ports/report-quota';

/**
 * The diagnostics rate limit, on the results-cache namespace.
 *
 * One namespace for this Worker, key-prefixed by feature — `tryon:` is the
 * render cache, `analysis:` the analysis cache, `diag:` this. A second
 * namespace would be a second thing to create, name and lose, for a counter
 * that expires by itself.
 */

/** Namespaced so a quota key can never collide with a cached render. */
const PREFIX = 'diag:';

/**
 * The same counter, for analyses.
 *
 * Its own prefix rather than a shared one so that a device in a crash loop
 * cannot eat the allowance it needs to ask what suits it — the two limits are
 * about different things and must not spend each other.
 */
const ANALYSIS_PREFIX = 'analysis:';

/**
 * How much of an ISO timestamp names the window, and how long the counter lives.
 *
 * Two days against a key that names one day: the key rolls at UTC midnight, so
 * the extra day is only there to let the previous day's counter fall out on its
 * own rather than lingering. Nothing reads a counter after its day is over.
 *
 * The minute window is 16 characters (`2026-08-27T12:00`) and two minutes,
 * which is KV's own floor on a TTL doubled for the same reason.
 */
const DAY = { chars: 10, ttl: 2 * 24 * 60 * 60 };
const MINUTE = { chars: 16, ttl: 120 };

export function kvReportQuota(namespace: KVNamespace): ReportQuotaPort {
  return quota(namespace, PREFIX, DAY);
}

/** The analysis limit, on the same namespace under its own prefix. */
export function kvAnalysisQuota(namespace: KVNamespace): ReportQuotaPort {
  return quota(namespace, ANALYSIS_PREFIX, DAY);
}

/**
 * How many new device ids one client network may bring in a day.
 *
 * Keyed on a hash of the network, never the address; see `networkKey`. Its own
 * prefix, so a farm of fresh installs cannot eat any device's allowance.
 */
export function kvNewDeviceQuota(namespace: KVNamespace): ReportQuotaPort {
  return quota(namespace, 'newdev:', DAY);
}

/** How many requests one client network may make a minute, under its own prefix. */
export function kvRequestRate(namespace: KVNamespace): ReportQuotaPort {
  return quota(namespace, 'rate:', MINUTE);
}

function quota(
  namespace: KVNamespace,
  prefix: string,
  window: { chars: number; ttl: number },
): ReportQuotaPort {
  return {
    async consume(subject, wanted, limit, at) {
      // UTC, not the phone's day. The device that reports errors is exactly the
      // device whose clock and timezone cannot be trusted, and a limit that
      // resets when the user flies somewhere is not a limit.
      const key = `${prefix}${subject}:${at.toISOString().slice(0, window.chars)}`;

      const raw = await namespace.get(key, 'text');
      const used = Number(raw);
      // A missing key and a corrupted one are the same thing: nothing spent.
      const spent = Number.isFinite(used) && used > 0 ? used : 0;

      const granted = Math.max(0, Math.min(wanted, limit - spent));
      if (granted === 0) return 0;

      await namespace.put(key, String(spent + granted), { expirationTtl: window.ttl });
      return granted;
    },
  };
}
