import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { d1UsageStats } from '../src/adapters/d1/usage-stats';
import schema from '../schema.sql?raw';

/**
 * The style counters against real D1.
 *
 * Everything worth proving here is SQL: that the upsert creates a row on first
 * sight and adds to it afterwards, that the two counters move independently,
 * and that the composite primary key really does key on the pair rather than on
 * the cut alone. A fake would prove none of it.
 */

const stats = () => d1UsageStats(env.DB);

beforeEach(async () => {
  const statements = schema
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  for (const statement of statements) await env.DB.exec(statement);

  await env.DB.exec('DELETE FROM style_use');
});

async function row(styleId: string, colorId: string) {
  return env.DB.prepare(
    'SELECT renders, replays FROM style_use WHERE style_id = ? AND color_id = ?',
  )
    .bind(styleId, colorId)
    .first<{ renders: number; replays: number }>();
}

describe('record', () => {
  it('creates the row the first time a pair is ever picked', async () => {
    await stats().record('blunt-bob', 'caramel', false);
    expect(await row('blunt-bob', 'caramel')).toEqual({ renders: 1, replays: 0 });
  });

  it('adds to the row afterwards', async () => {
    await stats().record('blunt-bob', 'caramel', false);
    await stats().record('blunt-bob', 'caramel', false);
    await stats().record('blunt-bob', 'caramel', false);
    expect(await row('blunt-bob', 'caramel')).toEqual({ renders: 3, replays: 0 });
  });

  it('moves the two counters independently', async () => {
    await stats().record('blunt-bob', 'caramel', false);
    await stats().record('blunt-bob', 'caramel', true);
    await stats().record('blunt-bob', 'caramel', true);
    expect(await row('blunt-bob', 'caramel')).toEqual({ renders: 1, replays: 2 });
  });

  it('starts a replay-only pair at zero renders', async () => {
    // The insert half of the upsert has to seed the column that was not hit.
    await stats().record('blunt-bob', 'caramel', true);
    expect(await row('blunt-bob', 'caramel')).toEqual({ renders: 0, replays: 1 });
  });

  it('keys on the pair, not on the cut', async () => {
    await stats().record('blunt-bob', 'caramel', false);
    await stats().record('blunt-bob', 'jet-black', false);
    expect(await row('blunt-bob', 'caramel')).toEqual({ renders: 1, replays: 0 });
    expect(await row('blunt-bob', 'jet-black')).toEqual({ renders: 1, replays: 0 });
  });

  it('never grows past one row per pair', async () => {
    for (let i = 0; i < 10; i += 1) await stats().record('pixie', 'copper', i % 2 === 0);
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM style_use').first<{ n: number }>();
    expect(count?.n).toBe(1);
  });
});

describe('reading it back', () => {
  it('ranks the cuts by total use', async () => {
    // The query this table exists to answer.
    await stats().record('pixie', 'copper', false);
    await stats().record('pixie', 'caramel', false);
    await stats().record('pixie', 'caramel', true);
    await stats().record('blunt-bob', 'copper', false);

    const { results } = await env.DB.prepare(
      `SELECT style_id, SUM(renders + replays) AS uses
       FROM style_use GROUP BY style_id ORDER BY uses DESC`,
    ).all<{ style_id: string; uses: number }>();

    expect(results).toEqual([
      { style_id: 'pixie', uses: 3 },
      { style_id: 'blunt-bob', uses: 1 },
    ]);
  });
});
