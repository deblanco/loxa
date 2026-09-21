import { INTRO_PRICE_LABEL, SINGLE_PHOTO_PRICE_LABEL } from '@loxa/shared';
import { describe, expect, it } from 'vitest';
import { restoreVerdict } from '../src/purchases/outcome';
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
    await expect(fakePurchases().pricing()).resolves.toEqual({
      price: '$9.99',
      introPrice: INTRO_PRICE_LABEL,
      singlePhoto: SINGLE_PHOTO_PRICE_LABEL,
    });
  });

  it('restores nothing', async () => {
    await expect(fakePurchases().restore()).resolves.toEqual({ transactionIds: [], subscribed: false });
  });

  it('configures without a store', async () => {
    await expect(fakePurchases().configure('device-1')).resolves.toBeUndefined();
  });
});

describe('restoreVerdict', () => {
  it('syncs consumables, because their credits exist only once the Worker is told', () => {
    expect(restoreVerdict({ transactionIds: ['tx1'], subscribed: false })).toBe('sync');
    expect(restoreVerdict({ transactionIds: ['tx1'], subscribed: true })).toBe('sync');
  });

  it('calls a subscription-only restore restored, not nothing', () => {
    // A subscription has no transaction id to hand over. Treating "no ids" as
    // "nothing" told a subscriber who had just got their plan back that there
    // was nothing to restore, which is what a reviewer testing Restore with a
    // sandbox subscription would have seen.
    expect(restoreVerdict({ transactionIds: [], subscribed: true })).toBe('restored');
  });

  it('says nothing only when there is nothing', () => {
    expect(restoreVerdict({ transactionIds: [], subscribed: false })).toBe('nothing');
  });
});
