import { describe, expect, it } from 'vitest';
import { PENDING_TTL_MS, isStale, syncUntilGranted } from '../src/purchases/settle';

/** A sync that answers each call from the list, in order: a number is `granted`, an Error is a throw. */
function scripted(answers: (number | Error)[]) {
  let calls = 0;
  const sync = async () => {
    const answer = answers[calls++];
    if (answer instanceof Error) throw answer;
    return { granted: answer ?? 0, creditsLeft: answer ?? 0 };
  };
  return { sync, calls: () => calls };
}

const waits: number[] = [];
const wait = async (ms: number) => {
  waits.push(ms);
};

describe('syncUntilGranted', () => {
  it('stops at the first sync that grants something', async () => {
    const { sync, calls } = scripted([1]);
    await expect(syncUntilGranted(sync, wait, 3)).resolves.toEqual({ granted: 1, creditsLeft: 1 });
    expect(calls()).toBe(1);
  });

  it('asks again while RevenueCat has not listed the purchase yet', async () => {
    // The case this exists for: the sheet has closed, the store has not caught up.
    const { sync, calls } = scripted([0, 0, 1]);
    await expect(syncUntilGranted(sync, wait, 3)).resolves.toEqual({ granted: 1, creditsLeft: 1 });
    expect(calls()).toBe(3);
  });

  it('answers null when every sync granted nothing', async () => {
    const { sync, calls } = scripted([0, 0, 0]);
    await expect(syncUntilGranted(sync, wait, 3)).resolves.toBeNull();
    expect(calls()).toBe(3);
  });

  it('treats an early failure as a reason to ask again', async () => {
    const { sync } = scripted([new Error('offline'), 1]);
    await expect(syncUntilGranted(sync, wait, 3)).resolves.toEqual({ granted: 1, creditsLeft: 1 });
  });

  it('rethrows when the last attempt could not reach the Worker', async () => {
    // So the paywall can say the store could not be reached, not that nothing happened.
    const { sync } = scripted([0, new Error('offline')]);
    await expect(syncUntilGranted(sync, wait, 2)).rejects.toThrow('offline');
  });

  it('waits between attempts and not after the last', async () => {
    waits.length = 0;
    const { sync } = scripted([0, 0, 0]);
    await syncUntilGranted(sync, wait, 3, 500);
    expect(waits).toEqual([500, 500]);
  });

  it('asks once and does not wait when told to ask once', async () => {
    waits.length = 0;
    const { sync, calls } = scripted([0]);
    await expect(syncUntilGranted(sync, wait, 1)).resolves.toBeNull();
    expect(calls()).toBe(1);
    expect(waits).toEqual([]);
  });
});

describe('isStale', () => {
  const at = '2026-09-01T00:00:00.000Z';
  const pending = { transactionIds: ['tx'], at };

  it('keeps asking for a week', () => {
    expect(isStale(pending, new Date(Date.parse(at) + PENDING_TTL_MS))).toBe(false);
  });

  it('gives up after it', () => {
    expect(isStale(pending, new Date(Date.parse(at) + PENDING_TTL_MS + 1))).toBe(true);
  });
});
