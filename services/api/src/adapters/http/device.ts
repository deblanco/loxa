import type { Context } from 'hono';

/**
 * The whole identity system.
 *
 * The app generates an opaque id on first launch and keeps it in AsyncStorage.
 * There are no accounts, no email, and nothing to log into — a hair try-on app
 * that asks who you are before showing you a haircut has lost most of its users
 * at the first screen.
 *
 * The cost is that credits live on a device. RevenueCat's restore-purchases
 * flow is the recovery path, which is a real limitation and a deliberate one.
 */
export function deviceIdFrom(c: Context): string | null {
  const raw = c.req.header('X-Device-Id');
  if (!raw) return null;

  const trimmed = raw.trim();
  // Bounded because it is a primary key and reaches a log line. The app sends a
  // UUID; anything wildly outside that is not our client.
  if (trimmed.length < 8 || trimmed.length > 128) return null;

  return trimmed;
}

/**
 * Whether this request asked to be treated as a subscriber.
 *
 * Only honoured when `DEV_PREMIUM` is also set in the environment, which never
 * happens in production. The app compiles this header out behind `__DEV__`.
 */
export function devPremiumFrom(c: Context): boolean {
  return c.req.header('X-Dev-Premium') === '1';
}

/**
 * The address this request came from, as the unit the abuse limits count.
 *
 * `CF-Connecting-IP` is set by Cloudflare's edge and replaces whatever the
 * client sent, which is why it can be trusted and `X-Forwarded-For` cannot.
 * Absent means local development, and the limits skip such a request.
 *
 * An IPv6 address is cut to its /64. That is the smallest block one subscriber
 * is given, so counting whole addresses would let a single household mint
 * 2^64 "different networks". IPv4 is counted as it is.
 */
export function clientNetworkFrom(c: Context): string | null {
  const ip = c.req.header('CF-Connecting-IP')?.trim().toLowerCase();
  if (!ip) return null;
  if (!ip.includes(':') || ip.includes('.')) return ip;

  // Expand the `::`, then keep the first four of the eight groups.
  const [head = '', tail] = ip.split('::');
  const before = head ? head.split(':') : [];
  const after = tail ? tail.split(':') : [];
  const gap = tail === undefined ? 0 : 8 - before.length - after.length;
  const groups = [...before, ...Array<string>(Math.max(0, gap)).fill('0'), ...after];

  return groups
    .slice(0, 4)
    .map((group) => parseInt(group, 16).toString(16))
    .join(':');
}
