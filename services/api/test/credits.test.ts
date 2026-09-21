import { describe, expect, it } from 'vitest';
import { getCredits } from '../src/core/get-credits';
import type { CreditState } from '../src/core/rules';
import { syncPurchases } from '../src/core/sync-purchases';
import { fakeEntitlements, fakeLedger, fixedClock } from './fakes';

describe('getCredits', () => {
  it('describes a fresh subscriber', async () => {
    const view = await getCredits('device-1', {
      ledger: fakeLedger().port,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
    });

    expect(view).toEqual({
      creditsLeft: 21,
      cap: 20,
      plan: 'weekly',
      resetsAt: '2026-08-31T00:00:00.000Z',
    });
  });

  it('describes a free user who has spent their one credit', async () => {
    const view = await getCredits('device-1', {
      ledger: fakeLedger({ week: '2026-W35', freeUsed: 1 }).port,
      entitlements: fakeEntitlements('free'),
      now: fixedClock,
    });

    expect(view).toEqual(expect.objectContaining({ creditsLeft: 0, cap: 0, plan: 'free' }));
  });

  it('does not persist the Monday roll while reading', async () => {
    // A read that persists the roll races with every other read, and there is
    // nothing to gain from it: the spend writes the rolled row anyway.
    const ledger = fakeLedger({ week: '2026-W34', weekUsed: 20, lastPlan: 'weekly' });
    await getCredits('device-1', {
      ledger: ledger.port,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
    });

    expect(ledger.writes).toHaveLength(0);
  });

  it('records a plan it has not seen before', async () => {
    // The only thing a read does persist. `lastPlan` used to be written by
    // `spendOne` alone, and a lapsed subscriber with an exhausted week has
    // nothing to spend — so the free interval left no trace and the next
    // subscription was compared against a stale "weekly" and refused its
    // allowance. Observing the change is what records it.
    const ledger = fakeLedger({ week: '2026-W35', weekUsed: 20, freeUsed: 1, lastPlan: 'weekly' });
    const view = await getCredits('device-1', {
      ledger: ledger.port,
      entitlements: fakeEntitlements('free'),
      now: fixedClock,
    });

    expect(view.creditsLeft).toBe(0);
    expect(ledger.writes).toHaveLength(1);
    expect(ledger.state.lastPlan).toBe('free');
    // The week it spent as a subscriber is not given back on the way out.
    expect(ledger.state.weekUsed).toBe(20);
  });

  it('starts the allowance over for a subscription bought after a lapse', async () => {
    // The whole point: read as free, then read as weekly, and the twenty they
    // just paid for are there.
    const ledger = fakeLedger({ week: '2026-W35', weekUsed: 20, freeUsed: 1, lastPlan: 'free' });
    const view = await getCredits('device-1', {
      ledger: ledger.port,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
    });

    expect(view.creditsLeft).toBe(20);
    expect(ledger.state.weekUsed).toBe(0);
    expect(ledger.state.lastPlan).toBe('weekly');
  });
});

describe('getCredits under a race', () => {
  it('does not write a stale row over a spend that landed after the read', async () => {
    // It read a plan change and went to record it; a render spent a credit in
    // between. A plain write would put the pre-spend row back.
    const ledger = fakeLedger({ week: '2026-W35', weekUsed: 4, lastPlan: 'free' });
    const racing = {
      ...ledger.port,
      async compareAndWrite(deviceId: string, expected: CreditState, next: CreditState) {
        await ledger.port.write(deviceId, { ...ledger.state, weekUsed: 5 });
        return ledger.port.compareAndWrite(deviceId, expected, next);
      },
    };

    const view = await getCredits('device-1', {
      ledger: racing,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
    });

    expect(view.plan).toBe('weekly');
    expect(ledger.state.weekUsed).toBe(5);
  });
});

describe('syncPurchases', () => {
  it('grants one credit per purchase the store reports', async () => {
    const ledger = fakeLedger();
    const result = await syncPurchases('device-1', {
      ledger: ledger.port,
      entitlements: fakeEntitlements('free', ['otp_1']),
      now: fixedClock,
    });

    expect(result.granted).toBe(1);
    expect(ledger.state.extraCredits).toBe(1);
    expect(result.creditsLeft).toBe(2); // the free credit plus the bought one
  });

  it('grants nothing when the store reports no purchases', async () => {
    const ledger = fakeLedger();
    const result = await syncPurchases('device-1', {
      ledger: ledger.port,
      entitlements: fakeEntitlements('free', []),
      now: fixedClock,
    });

    expect(result.granted).toBe(0);
    expect(ledger.state.extraCredits).toBe(0);
  });

  it('grants once across repeated syncs', async () => {
    // The normal case, not an attack: the app re-syncs after every purchase and
    // every restore, so the same purchase ids arrive constantly.
    const ledger = fakeLedger();
    const deps = {
      ledger: ledger.port,
      entitlements: fakeEntitlements('free', ['otp_1']),
      now: fixedClock,
    };

    await syncPurchases('device-1', deps);
    const second = await syncPurchases('device-1', deps);

    expect(second.granted).toBe(0);
    expect(ledger.state.extraCredits).toBe(1);
  });

  it('grants every outstanding purchase in one sync', async () => {
    // What a restore looks like, and what the devices stranded by the id
    // mismatch will see the first time they sync against the fix.
    const ledger = fakeLedger();
    const result = await syncPurchases('device-1', {
      ledger: ledger.port,
      entitlements: fakeEntitlements('free', ['otp_1', 'otp_2', 'otp_3']),
      now: fixedClock,
    });

    expect(result.granted).toBe(3);
    expect(ledger.state.extraCredits).toBe(3);
  });

  it('grants once when two syncs of one purchase arrive together', async () => {
    const ledger = fakeLedger();
    const deps = {
      ledger: ledger.port,
      entitlements: fakeEntitlements('free', ['otp_1']),
      now: fixedClock,
    };

    const results = await Promise.all([
      syncPurchases('device-1', deps),
      syncPurchases('device-1', deps),
    ]);

    expect(results.reduce((sum, r) => sum + r.granted, 0)).toBe(1);
    expect(ledger.state.extraCredits).toBe(1);
  });
});
