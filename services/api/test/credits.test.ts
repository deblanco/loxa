import { describe, expect, it } from 'vitest';
import { getCredits } from '../src/core/get-credits';
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
      creditsLeft: 20,
      cap: 20,
      plan: 'weekly',
      resetsAt: '2026-08-31T00:00:00.000Z',
    });
  });

  it('describes a free user, who has nothing', async () => {
    const view = await getCredits('device-1', {
      ledger: fakeLedger({ week: '2026-W35' }).port,
      entitlements: fakeEntitlements('free'),
      now: fixedClock,
    });

    expect(view).toEqual(expect.objectContaining({ creditsLeft: 0, cap: 0, plan: 'free' }));
  });

  it('does not write while reading', async () => {
    // A read that persists the Monday roll races with every other read, and
    // there is nothing to gain from it: the spend writes the rolled row anyway.
    const ledger = fakeLedger({ week: '2026-W34', weekUsed: 20 });
    await getCredits('device-1', {
      ledger: ledger.port,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
    });

    expect(ledger.writes).toHaveLength(0);
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
    expect(result.creditsLeft).toBe(1); // the bought one, and nothing else
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
});
