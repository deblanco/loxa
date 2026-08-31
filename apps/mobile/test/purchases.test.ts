import { INTRO_PRICE_LABEL } from '@loxa/shared';
import { describe, expect, it } from 'vitest';
import { fakePurchases } from '../src/purchases/fake';

describe('the fake store', () => {
  it('lets the paywall be dismissed in a simulator', async () => {
    // Without this, every screen behind the paywall is unreachable in a plain
    // simulator run, because StoreKit cannot answer there.
    await expect(fakePurchases().buyWeekly()).resolves.toBe(true);
  });

  it('invents transaction ids that the Worker will refuse', async () => {
    // The point: a fake purchase must not become a real credit. These ids are
    // unverifiable, and `verifyPurchase` on the server says no.
    const ids = await fakePurchases().buySinglePhoto();
    expect(ids?.[0]).toMatch(/^fake_/);
  });

  it('quotes the shipped price, intro included', async () => {
    // The simulator has never subscribed to anything, so the offer screen it
    // renders is the eligible one — which is the screen worth being able to see.
    await expect(fakePurchases().weeklyPricing()).resolves.toEqual({
      price: '$9.99',
      introPrice: INTRO_PRICE_LABEL,
    });
  });

  it('restores nothing', async () => {
    await expect(fakePurchases().restore()).resolves.toEqual([]);
  });

  it('configures without a store', async () => {
    await expect(fakePurchases().configure('device-1')).resolves.toBeUndefined();
  });
});
