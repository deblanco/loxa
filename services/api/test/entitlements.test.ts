import { SINGLE_PHOTO_PRODUCT_ID, WEEKLY_ENTITLEMENT, WEEKLY_PRODUCT_ID } from '@loxa/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { devEntitlements } from '../src/adapters/entitlements/dev';
import { revenueCatEntitlements } from '../src/adapters/entitlements/revenuecat';
import { stubEntitlements } from '../src/adapters/entitlements/stub';

const config = { secretKey: 'sk_test', projectId: 'proj_test' };
const DEVICE = 'device-1';

/** Answer whichever v2 path the adapter asks for; anything else is a failure. */
function interceptRevenueCat(routes: { entitlements?: unknown; purchases?: unknown; status?: number }) {
  const seen: string[] = [];

  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    seen.push(url);

    // The secret key must travel, and must be the `sk_` one — a request without
    // it would 401 in production and answer "not a subscriber" here forever.
    expect((init?.headers as Record<string, string>)?.authorization).toBe('Bearer sk_test');

    if (routes.status) return new Response('nope', { status: routes.status });
    if (url.includes('/active_entitlements')) return Response.json(routes.entitlements ?? {});
    if (url.includes('/purchases')) return Response.json(routes.purchases ?? {});
    throw new Error(`unexpected url ${url}`);
  });

  return seen;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('revenueCatEntitlements.planFor', () => {
  it('reads the weekly entitlement by its lookup key', async () => {
    interceptRevenueCat({ entitlements: { items: [{ entitlement_id: WEEKLY_ENTITLEMENT }] } });
    await expect(revenueCatEntitlements(config).planFor(DEVICE)).resolves.toBe('weekly');
  });

  it('reads it by RevenueCat own id when that is how the answer names it', async () => {
    // Which of the two shapes appears has moved between API revisions, so both
    // are matched and neither is assumed.
    interceptRevenueCat({ entitlements: { items: [{ entitlement_id: 'entl_abc' }] } });
    await expect(
      revenueCatEntitlements({ ...config, weeklyEntitlementId: 'entl_abc' }).planFor(DEVICE),
    ).resolves.toBe('weekly');
  });

  it('answers free when some other entitlement is active', async () => {
    interceptRevenueCat({ entitlements: { items: [{ entitlement_id: 'something_else' }] } });
    await expect(revenueCatEntitlements(config).planFor(DEVICE)).resolves.toBe('free');
  });

  it('answers free when nothing is active', async () => {
    interceptRevenueCat({ entitlements: { items: [] } });
    await expect(revenueCatEntitlements(config).planFor(DEVICE)).resolves.toBe('free');
  });

  it('fails closed on a 403', async () => {
    // What a v1 key gets from the v2 endpoint. It must not read as "subscriber".
    interceptRevenueCat({ status: 403 });
    await expect(revenueCatEntitlements(config).planFor(DEVICE)).resolves.toBe('free');
  });

  it('fails closed when the network is down', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('ECONNREFUSED');
    });
    await expect(revenueCatEntitlements(config).planFor(DEVICE)).resolves.toBe('free');
  });

  it('fails closed on a shape it does not recognise', async () => {
    interceptRevenueCat({ entitlements: { unexpected: true } });
    await expect(revenueCatEntitlements(config).planFor(DEVICE)).resolves.toBe('free');
  });

  it('escapes the device id into the path', async () => {
    const seen = interceptRevenueCat({ entitlements: { items: [] } });
    await revenueCatEntitlements(config).planFor('a/b?c');
    expect(seen[0]).toContain('a%2Fb%3Fc');
  });
});

describe('revenueCatEntitlements.verifyPurchase', () => {
  it('confirms a photo purchase by its id', async () => {
    interceptRevenueCat({
      purchases: { items: [{ id: 'tx_1', product_id: SINGLE_PHOTO_PRODUCT_ID }] },
    });
    await expect(revenueCatEntitlements(config).verifyPurchase(DEVICE, 'tx_1')).resolves.toBe(true);
  });

  it('confirms it by the store identifier too', async () => {
    interceptRevenueCat({
      purchases: {
        items: [{ id: 'rc_internal', store_purchase_identifier: 'tx_1', product_id: SINGLE_PHOTO_PRODUCT_ID }],
      },
    });
    await expect(revenueCatEntitlements(config).verifyPurchase(DEVICE, 'tx_1')).resolves.toBe(true);
  });

  it('refuses an id that belongs to a subscription renewal', async () => {
    // Otherwise a renewal could be replayed as a $0.99 photo, over and over.
    interceptRevenueCat({ purchases: { items: [{ id: 'tx_1', product_id: WEEKLY_PRODUCT_ID }] } });
    await expect(revenueCatEntitlements(config).verifyPurchase(DEVICE, 'tx_1')).resolves.toBe(false);
  });

  it('refuses an id the store has never seen', async () => {
    interceptRevenueCat({ purchases: { items: [] } });
    await expect(revenueCatEntitlements(config).verifyPurchase(DEVICE, 'forged')).resolves.toBe(false);
  });

  it('fails closed when the store cannot be reached', async () => {
    interceptRevenueCat({ status: 500 });
    await expect(revenueCatEntitlements(config).verifyPurchase(DEVICE, 'tx_1')).resolves.toBe(false);
  });
});

describe('the non-store adapters', () => {
  it('stub: nobody is a subscriber and nothing was bought', async () => {
    const port = stubEntitlements();
    await expect(port.planFor(DEVICE)).resolves.toBe('free');
    await expect(port.verifyPurchase(DEVICE, 'tx_1')).resolves.toBe(false);
  });

  it('dev: a subscriber, but still no free credits from thin air', async () => {
    const port = devEntitlements();
    await expect(port.planFor(DEVICE)).resolves.toBe('weekly');
    // Granting one would write a row to credit_grant that outlives the switch.
    await expect(port.verifyPurchase(DEVICE, 'tx_1')).resolves.toBe(false);
  });
});
