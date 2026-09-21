import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { d1CreditLedger } from '../src/adapters/d1/credit-ledger';
import { EMPTY_STATE } from '../src/core/rules';
import schema from '../schema.sql?raw';

/**
 * The D1 adapter against real D1.
 *
 * The things worth proving here are all SQL behaviour, not TypeScript: the
 * upsert, that `INSERT OR IGNORE` really does report zero changes on a
 * primary-key collision, and that the compare-and-swap really does refuse a
 * row that has moved. A fake would prove none of them.
 */

const ledger = () => d1CreditLedger(env.DB);
const DEVICE = 'device-abcdef01';
const AT = new Date('2026-08-27T12:00:00Z');

beforeEach(async () => {
  const statements = schema
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  for (const statement of statements) await env.DB.exec(statement);

  await env.DB.exec('DELETE FROM device_credits');
  await env.DB.exec('DELETE FROM credit_grant');
});

describe('read', () => {
  it('treats a device nobody has seen as an all-zero row', async () => {
    // Every user's first launch, not an error.
    await expect(ledger().read('nobody')).resolves.toEqual(EMPTY_STATE);
  });

  it('reads back what was written', async () => {
    const state = { week: '2026-W35', weekUsed: 3, freeUsed: 1, extraCredits: 2, lastPlan: 'weekly' as const };
    await ledger().write(DEVICE, state);
    await expect(ledger().read(DEVICE)).resolves.toEqual(state);
  });
});

describe('write', () => {
  it('inserts on the first spend of a device life', async () => {
    await ledger().write(DEVICE, { ...EMPTY_STATE, week: '2026-W35', weekUsed: 1 });
    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM device_credits')
      .first<{ n: number }>();
    expect(row?.n).toBe(1);
  });

  it('updates in place rather than adding a second row', async () => {
    const port = ledger();
    await port.write(DEVICE, { ...EMPTY_STATE, week: '2026-W35', weekUsed: 1 });
    await port.write(DEVICE, { ...EMPTY_STATE, week: '2026-W35', weekUsed: 2 });

    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM device_credits')
      .first<{ n: number }>();
    expect(row?.n).toBe(1);
    await expect(port.read(DEVICE)).resolves.toEqual(
      expect.objectContaining({ weekUsed: 2 }),
    );
  });

  it('keeps two devices apart', async () => {
    const port = ledger();
    await port.write('device-aaaaaaaa', { ...EMPTY_STATE, week: '2026-W35', weekUsed: 5 });
    await port.write('device-bbbbbbbb', { ...EMPTY_STATE, week: '2026-W35', weekUsed: 1 });

    await expect(port.read('device-aaaaaaaa')).resolves.toEqual(
      expect.objectContaining({ weekUsed: 5 }),
    );
  });

  it('stores a null week for a row that has never been rolled', async () => {
    await ledger().write(DEVICE, EMPTY_STATE);
    await expect(ledger().read(DEVICE)).resolves.toEqual(
      expect.objectContaining({ week: null }),
    );
  });
});

describe('compareAndWrite', () => {
  const READ = { ...EMPTY_STATE, week: '2026-W35', weekUsed: 1 };
  const NEXT = { ...READ, weekUsed: 2 };

  it('inserts for a device with no row, which reads as the empty state', async () => {
    await expect(ledger().compareAndWrite(DEVICE, EMPTY_STATE, NEXT)).resolves.toBe(true);
    await expect(ledger().read(DEVICE)).resolves.toEqual(NEXT);
  });

  it('swaps a row that still holds what was read', async () => {
    const port = ledger();
    await port.write(DEVICE, READ);

    await expect(port.compareAndWrite(DEVICE, READ, NEXT)).resolves.toBe(true);
    await expect(port.read(DEVICE)).resolves.toEqual(NEXT);
  });

  it('matches the NULL week and plan of a row nobody has spent from', async () => {
    // `=` against NULL is never true; the statement has to use `IS`.
    const port = ledger();
    await port.write(DEVICE, EMPTY_STATE);

    await expect(port.compareAndWrite(DEVICE, EMPTY_STATE, NEXT)).resolves.toBe(true);
  });

  it('refuses a row that has moved since it was read, and leaves it alone', async () => {
    const port = ledger();
    await port.write(DEVICE, { ...READ, weekUsed: 5 });

    await expect(port.compareAndWrite(DEVICE, READ, NEXT)).resolves.toBe(false);
    await expect(port.read(DEVICE)).resolves.toEqual(expect.objectContaining({ weekUsed: 5 }));
  });

  it('notices a change in any one field', async () => {
    const port = ledger();
    const row = { ...READ, freeUsed: 1, extraCredits: 2, lastPlan: 'weekly' as const };
    await port.write(DEVICE, row);

    for (const stale of [
      { ...row, week: '2026-W34' },
      { ...row, weekUsed: 0 },
      { ...row, freeUsed: 0 },
      { ...row, extraCredits: 0 },
      { ...row, lastPlan: null },
    ]) {
      await expect(port.compareAndWrite(DEVICE, stale, NEXT)).resolves.toBe(false);
    }
    await expect(port.read(DEVICE)).resolves.toEqual(row);
  });

  it('refuses the second of two swaps made from the same read', async () => {
    // The race itself, on the real database: both read READ, both swap.
    const port = ledger();
    await port.write(DEVICE, READ);

    const results = await Promise.all([
      port.compareAndWrite(DEVICE, READ, { ...READ, weekUsed: 2 }),
      port.compareAndWrite(DEVICE, READ, { ...READ, weekUsed: 2 }),
      port.compareAndWrite(DEVICE, READ, { ...READ, weekUsed: 2 }),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    await expect(port.read(DEVICE)).resolves.toEqual(expect.objectContaining({ weekUsed: 2 }));
  });

  it('lets exactly one of several first writes create the row', async () => {
    const port = ledger();

    const results = await Promise.all(
      [1, 2, 3].map(() => port.compareAndWrite(DEVICE, EMPTY_STATE, NEXT)),
    );

    expect(results.filter(Boolean)).toHaveLength(1);
    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM device_credits')
      .first<{ n: number }>();
    expect(row?.n).toBe(1);
  });
});

describe('grantCredit', () => {
  it('adds the credit to a device that has no row', async () => {
    await ledger().grantCredit(DEVICE, 'tx_1', AT);
    await expect(ledger().read(DEVICE)).resolves.toEqual({ ...EMPTY_STATE, extraCredits: 1 });
  });

  it('adds it beside what the row already holds', async () => {
    const state = { week: '2026-W35', weekUsed: 3, freeUsed: 1, extraCredits: 2, lastPlan: 'weekly' as const };
    await ledger().write(DEVICE, state);

    await ledger().grantCredit(DEVICE, 'tx_1', AT);
    await expect(ledger().read(DEVICE)).resolves.toEqual({ ...state, extraCredits: 3 });
  });

  it('adds nothing for a replay', async () => {
    const port = ledger();
    await port.grantCredit(DEVICE, 'tx_1', AT);
    await port.grantCredit(DEVICE, 'tx_1', AT);

    await expect(port.read(DEVICE)).resolves.toEqual(expect.objectContaining({ extraCredits: 1 }));
  });

  it('adds nothing when another device already claimed the transaction', async () => {
    const port = ledger();
    await port.grantCredit('device-aaaaaaaa', 'tx_1', AT);
    await port.grantCredit('device-bbbbbbbb', 'tx_1', AT);

    await expect(port.read('device-bbbbbbbb')).resolves.toEqual(EMPTY_STATE);
  });

  it('keeps every credit when purchases sync at the same moment', async () => {
    // What `extra_credits = extra_credits + 1` is for: computed from a read,
    // five simultaneous grants would leave the count at one.
    const port = ledger();
    await Promise.all(['a', 'b', 'c', 'd', 'e'].map((tx) => port.grantCredit(DEVICE, `tx_${tx}`, AT)));

    await expect(port.read(DEVICE)).resolves.toEqual(expect.objectContaining({ extraCredits: 5 }));
  });

  it('grants a purchase synced twice at the same moment once', async () => {
    const port = ledger();
    const results = await Promise.all([1, 2, 3].map(() => port.grantCredit(DEVICE, 'tx_1', AT)));

    expect(results.filter(Boolean)).toHaveLength(1);
    await expect(port.read(DEVICE)).resolves.toEqual(expect.objectContaining({ extraCredits: 1 }));
  });

  it('does not lose a credit to a spend that swapped in between', async () => {
    // Read, then a purchase lands, then the spend swaps from the stale read: the
    // swap is refused and the credit is still there.
    const port = ledger();
    const read = await port.read(DEVICE);
    await port.grantCredit(DEVICE, 'tx_1', AT);

    await expect(
      port.compareAndWrite(DEVICE, read, { ...read, week: '2026-W35', freeUsed: 1 }),
    ).resolves.toBe(false);
    await expect(port.read(DEVICE)).resolves.toEqual(expect.objectContaining({ extraCredits: 1 }));
  });

  it('reports the first sighting of a transaction', async () => {
    await expect(ledger().grantCredit(DEVICE, 'tx_1', AT)).resolves.toBe(true);
  });

  it('reports a replay as already granted', async () => {
    // The app re-syncs on every launch, so this is the ordinary case rather
    // than an attack — and it must be worth one credit in total.
    const port = ledger();
    await port.grantCredit(DEVICE, 'tx_1', AT);
    await expect(port.grantCredit(DEVICE, 'tx_1', AT)).resolves.toBe(false);
  });

  it('refuses a transaction already claimed by another device', async () => {
    const port = ledger();
    await port.grantCredit('device-aaaaaaaa', 'tx_1', AT);
    await expect(port.grantCredit('device-bbbbbbbb', 'tx_1', AT)).resolves.toBe(false);
  });

  it('keeps distinct transactions apart', async () => {
    const port = ledger();
    await expect(port.grantCredit(DEVICE, 'tx_1', AT)).resolves.toBe(true);
    await expect(port.grantCredit(DEVICE, 'tx_2', AT)).resolves.toBe(true);
  });
});
