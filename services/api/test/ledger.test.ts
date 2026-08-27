import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { d1CreditLedger } from '../src/adapters/d1/credit-ledger';
import { EMPTY_STATE } from '../src/core/rules';
import schema from '../schema.sql?raw';

/**
 * The D1 adapter against real D1.
 *
 * The two things worth proving here are both SQL behaviour, not TypeScript: the
 * upsert, and that `INSERT OR IGNORE` really does report zero changes on a
 * primary-key collision. A fake would prove neither.
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
    const state = { week: '2026-W35', weekUsed: 3, freeUsed: 1, extraCredits: 2 };
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

describe('recordGrant', () => {
  it('reports the first sighting of a transaction', async () => {
    await expect(ledger().recordGrant(DEVICE, 'tx_1', AT)).resolves.toBe(true);
  });

  it('reports a replay as already granted', async () => {
    // The app re-syncs on every launch, so this is the ordinary case rather
    // than an attack — and it must be worth one credit in total.
    const port = ledger();
    await port.recordGrant(DEVICE, 'tx_1', AT);
    await expect(port.recordGrant(DEVICE, 'tx_1', AT)).resolves.toBe(false);
  });

  it('refuses a transaction already claimed by another device', async () => {
    const port = ledger();
    await port.recordGrant('device-aaaaaaaa', 'tx_1', AT);
    await expect(port.recordGrant('device-bbbbbbbb', 'tx_1', AT)).resolves.toBe(false);
  });

  it('keeps distinct transactions apart', async () => {
    const port = ledger();
    await expect(port.recordGrant(DEVICE, 'tx_1', AT)).resolves.toBe(true);
    await expect(port.recordGrant(DEVICE, 'tx_2', AT)).resolves.toBe(true);
  });
});
