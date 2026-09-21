import { describe, expect, it } from 'vitest';
import { networkKey } from '../src/core/cache-key';
import { NetworkRateError } from '../src/core/errors';
import {
  NEW_DEVICES_PER_NETWORK_PER_DAY,
  REQUESTS_PER_NETWORK_PER_MINUTE,
  admitDevice,
  limitRequests,
} from '../src/core/network-limits';
import { available, spendOne } from '../src/core/rules';
import { fakeLedger, fakeQuota, fixedClock } from './fakes';

const DEVICE = 'device-abcdef01';
const IP = '203.0.113.7';

function admission(initial = {}, exhausted = false) {
  const ledger = fakeLedger(initial);
  const quota = fakeQuota(exhausted);
  return { ledger, quota, deps: { ledger: ledger.port, quota: quota.port, now: fixedClock } };
}

describe('admitDevice', () => {
  it('registers a new device with its free credit intact', async () => {
    const { ledger, deps } = admission();
    await admitDevice(DEVICE, IP, deps);

    expect(ledger.state).toEqual(expect.objectContaining({ week: '2026-W35', freeUsed: 0 }));
    expect(available(ledger.state, 'free', fixedClock())).toBe(1);
  });

  it('registers a device over the cap with the free credit already spent', async () => {
    // Still admitted, and still able to subscribe or buy: only the free pool is
    // withheld, so the balance it sees is zero from the first request.
    const { ledger, deps } = admission({}, true);
    await admitDevice(DEVICE, IP, deps);

    expect(ledger.state.freeUsed).toBe(1);
    expect(available(ledger.state, 'free', fixedClock())).toBe(0);
    expect(available(ledger.state, 'weekly', fixedClock())).toBe(20);
    expect(spendOne({ ...ledger.state, extraCredits: 1 }, 'free', fixedClock())?.pool).toBe('extra');
  });

  it('keeps a credit bought before the device was first seen', async () => {
    // A purchase that synced first leaves a row with credits and no week.
    const { ledger, deps } = admission({ extraCredits: 2 }, true);
    await admitDevice(DEVICE, IP, deps);

    expect(ledger.state).toEqual(
      expect.objectContaining({ week: '2026-W35', freeUsed: 1, extraCredits: 2 }),
    );
  });

  it('asks the quota for one new id against the daily cap, keyed on a hash of the address', async () => {
    const { quota, deps } = admission();
    await admitDevice(DEVICE, IP, deps);

    expect(quota.calls).toEqual([
      { deviceId: await networkKey(IP), wanted: 1, limit: NEW_DEVICES_PER_NETWORK_PER_DAY },
    ]);
    // Neither the address nor the device id is in what was counted under.
    const key = quota.calls[0]!.deviceId;
    expect(key).not.toContain(IP);
    expect(key).not.toContain(DEVICE);
  });

  it('does not count a device it has seen before', async () => {
    const { ledger, quota, deps } = admission({ week: '2026-W34', freeUsed: 1 }, true);
    await admitDevice(DEVICE, IP, deps);

    expect(quota.calls).toEqual([]);
    expect(ledger.writes).toEqual([]);
  });

  it('does nothing when the request carried no address', async () => {
    const { ledger, quota, deps } = admission({}, true);
    await admitDevice(DEVICE, null, deps);

    expect(quota.calls).toEqual([]);
    expect(ledger.writes).toEqual([]);
  });

  it('leaves a device that a concurrent request registered first as that request left it', async () => {
    const { ledger, deps } = admission();
    const racing = {
      ...deps,
      ledger: {
        ...ledger.port,
        async compareAndWrite() {
          await ledger.port.write(DEVICE, { ...ledger.state, week: '2026-W35', freeUsed: 1 });
          return false;
        },
      },
    };

    await admitDevice(DEVICE, IP, racing);
    expect(ledger.state.freeUsed).toBe(1);
  });
});

describe('limitRequests', () => {
  it('lets a network under the limit through, counted against its hash', async () => {
    const quota = fakeQuota();
    await limitRequests(IP, { quota: quota.port, now: fixedClock });

    expect(quota.calls).toEqual([
      { deviceId: await networkKey(IP), wanted: 1, limit: REQUESTS_PER_NETWORK_PER_MINUTE },
    ]);
  });

  it('refuses a network that has spent its minute', async () => {
    const quota = fakeQuota(true);
    await expect(limitRequests(IP, { quota: quota.port, now: fixedClock })).rejects.toThrow(
      NetworkRateError,
    );
  });

  it('does nothing when the request carried no address', async () => {
    const quota = fakeQuota(true);
    await expect(limitRequests(null, { quota: quota.port, now: fixedClock })).resolves.toBeUndefined();
    expect(quota.calls).toEqual([]);
  });
});
