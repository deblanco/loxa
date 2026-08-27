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
