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
  it('grants one credit per verified purchase', async () => {
    const ledger = fakeLedger();
    const result = await syncPurchases('device-1', ['tx_1'], {
      ledger: ledger.port,
      entitlements: fakeEntitlements('free', ['tx_1']),
      now: fixedClock,
    });

    expect(result.granted).toBe(1);
    expect(ledger.state.extraCredits).toBe(1);
    expect(result.creditsLeft).toBe(2); // the free credit plus the bought one
  });

  it('grants nothing for an id the store does not know', async () => {
    const ledger = fakeLedger();
    const result = await syncPurchases('device-1', ['forged'], {
      ledger: ledger.port,
      entitlements: fakeEntitlements('free', []),
      now: fixedClock,
    });

    expect(result.granted).toBe(0);
    expect(ledger.state.extraCredits).toBe(0);
  });

  it('grants once for an id sent twice in one call', async () => {
    const ledger = fakeLedger();
    const result = await syncPurchases('device-1', ['tx_1', 'tx_1'], {
      ledger: ledger.port,
      entitlements: fakeEntitlements('free', ['tx_1']),
      now: fixedClock,
    });

    expect(result.granted).toBe(1);
    expect(ledger.state.extraCredits).toBe(1);
  });

  it('grants once across repeated syncs', async () => {
    // The normal case, not an attack: the app re-syncs on every launch and
    // after every restore, so the same id arrives constantly.
    const ledger = fakeLedger();
    const deps = {
      ledger: ledger.port,
      entitlements: fakeEntitlements('free', ['tx_1']),
      now: fixedClock,
    };

    await syncPurchases('device-1', ['tx_1'], deps);
    const second = await syncPurchases('device-1', ['tx_1'], deps);

    expect(second.granted).toBe(0);
    expect(ledger.state.extraCredits).toBe(1);
  });

  it('grants the verified ids out of a mixed batch', async () => {
    const ledger = fakeLedger();
    const result = await syncPurchases('device-1', ['tx_1', 'forged', 'tx_2'], {
      ledger: ledger.port,
      entitlements: fakeEntitlements('free', ['tx_1', 'tx_2']),
      now: fixedClock,
    });

    expect(result.granted).toBe(2);
    expect(ledger.state.extraCredits).toBe(2);
  });
});
