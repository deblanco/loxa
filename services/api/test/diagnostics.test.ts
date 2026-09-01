import { SELF, env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import schema from '../schema.sql?raw';
import { DAILY_REPORT_LIMIT, reportDiagnostics } from '../src/core/report-diagnostics';
import { d1Diagnostics } from '../src/adapters/d1/diagnostics';
import { kvReportQuota } from '../src/adapters/kv/report-quota';
import type { DiagnosticReport } from '@loxa/shared';

/**
 * The error sink, end to end and in pieces.
 *
 * The two things worth proving are that a report is written without an
 * identifier and that a device in a crash loop cannot fill the table. Both are
 * promises made outside the code — one on the privacy policy page, one in the
 * comment on the route — so both get a test rather than a reading.
 */

const DEVICE = 'device-abcdef01';

const report = (over: Partial<DiagnosticReport> = {}): DiagnosticReport => ({
  kind: 'handled',
  message: 'boom',
  appVersion: '1.0.0',
  osVersion: 'ios 18.0',
  locale: 'en',
  breadcrumbs: [],
  ...over,
});

function post(payload: unknown, headers: Record<string, string> = {}) {
  return SELF.fetch('https://loxa.test/v1/diagnostics', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Device-Id': DEVICE, ...headers },
    body: JSON.stringify(payload),
  });
}

async function applySchema() {
  const statements = schema
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  for (const statement of statements) await env.DB.exec(statement);
}

beforeEach(async () => {
  await applySchema();
  await env.DB.exec('DELETE FROM diagnostic_report');

  // The quota counter lives in KV, which outlives D1 between tests — a leftover
  // count would spend the next test's allowance before it asked for any.
  const cached = await env.RESULTS_CACHE.list();
  await Promise.all(cached.keys.map((key) => env.RESULTS_CACHE.delete(key.name)));
});

describe('POST /v1/diagnostics', () => {
  it('writes a batch and says how many it took', async () => {
    const response = await post({ reports: [report(), report({ kind: 'crash' })] });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accepted: 2 });

    const { results } = await env.DB.prepare(
      'SELECT kind, message, app_version, breadcrumbs FROM diagnostic_report ORDER BY kind',
    ).all();

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ kind: 'crash', message: 'boom', app_version: '1.0.0' });
    expect(results[1]).toMatchObject({ kind: 'handled', breadcrumbs: '[]' });
  });

  /**
   * The promise the privacy policy makes, tested rather than trusted.
   *
   * Asserted against the whole row rather than against the absence of a column,
   * so a future migration that adds one has to break this test on its way in.
   */
  it('stores nothing that identifies the device', async () => {
    await post({ reports: [report()] });

    const row = await env.DB.prepare('SELECT * FROM diagnostic_report').first();

    expect(row).toBeTruthy();
    expect(JSON.stringify(row)).not.toContain(DEVICE);
    expect(Object.keys(row ?? {})).not.toContain('device_id');
  });

  it('keeps the breadcrumb trail', async () => {
    await post({
      reports: [report({ breadcrumbs: [{ at: 1200, label: 'route /preview' }], route: '/preview' })],
    });

    const row = await env.DB.prepare(
      'SELECT route, breadcrumbs FROM diagnostic_report',
    ).first<{ route: string; breadcrumbs: string }>();

    expect(row?.route).toBe('/preview');
    expect(JSON.parse(row?.breadcrumbs ?? '[]')).toEqual([{ at: 1200, label: 'route /preview' }]);
  });

  it('refuses a request with no device id', async () => {
    const response = await SELF.fetch('https://loxa.test/v1/diagnostics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reports: [report()] }),
    });

    expect(response.status).toBe(400);
    expect(await env.DB.prepare('SELECT count(*) c FROM diagnostic_report').first('c')).toBe(0);
  });

  it('refuses a body that is not JSON', async () => {
    const response = await SELF.fetch('https://loxa.test/v1/diagnostics', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Device-Id': DEVICE },
      body: 'not json',
    });

    expect(response.status).toBe(400);
  });

  it('refuses an empty batch and an unknown kind', async () => {
    expect((await post({ reports: [] })).status).toBe(400);
    expect((await post({ reports: [report({ kind: 'whatever' as 'crash' })] })).status).toBe(400);
  });

  /**
   * The cap is at the schema so an oversized report is refused before it is a
   * large write. A message past 500 characters is the cheapest proof.
   */
  /**
   * The app scrubs before sending, so this only fires for a client that is old,
   * broken, or not ours. It is the difference between "no photo is stored on
   * our server" being a property of this table and being a property of whoever
   * is calling it.
   */
  it('scrubs image data a client failed to scrub', async () => {
    await post({ reports: [report({ message: `upload failed ${'A'.repeat(300)}` })] });

    const message = await env.DB.prepare('SELECT message FROM diagnostic_report').first('message');

    expect(message).toBe('upload failed [redacted]');
  });

  it('scrubs it out of the stack too', async () => {
    await post({
      reports: [report({ stack: `Error: boom\n  at send(${'Zm9v'.repeat(100)})` })],
    });

    const stack = await env.DB.prepare('SELECT stack FROM diagnostic_report').first<string>('stack');

    expect(stack).toContain('[redacted]');
    expect(stack).not.toContain('Zm9vZm9v');
  });

  it('refuses a report larger than the contract allows', async () => {
    const response = await post({ reports: [report({ message: 'x'.repeat(501) })] });

    expect(response.status).toBe(400);
    expect(await env.DB.prepare('SELECT count(*) c FROM diagnostic_report').first('c')).toBe(0);
  });

  it('stops a device once its day is spent, without failing it', async () => {
    // Twenty at a time, the contract's maximum, until the allowance is gone.
    const batch = { reports: Array.from({ length: 20 }, () => report()) };
    for (let sent = 0; sent < DAILY_REPORT_LIMIT; sent += 20) await post(batch);

    const response = await post(batch);

    // A 200 rather than a 429: the app has already dropped its queue, and
    // telling a phone having a bad day that its complaint was rejected helps
    // nobody.
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accepted: 0 });
    expect(await env.DB.prepare('SELECT count(*) c FROM diagnostic_report').first('c')).toBe(
      DAILY_REPORT_LIMIT,
    );
  });

  it('lets a different device through on the same day', async () => {
    const batch = { reports: Array.from({ length: 20 }, () => report()) };
    for (let sent = 0; sent < DAILY_REPORT_LIMIT; sent += 20) await post(batch);

    const response = await post({ reports: [report()] }, { 'X-Device-Id': 'device-99999999' });

    expect(await response.json()).toEqual({ accepted: 1 });
  });
});

describe('retention', () => {
  /**
   * This database has no cron, so the prune runs on write. A row past thirty
   * days has to disappear the next time anything is reported.
   */
  it('drops rows past thirty days on the next write', async () => {
    const old = new Date('2026-01-01T00:00:00.000Z').toISOString();
    await env.DB.prepare(
      `INSERT INTO diagnostic_report
         (id, kind, message, app_version, os_version, locale, breadcrumbs, reported_at)
       VALUES ('old', 'crash', 'ancient', '0.9.0', 'ios 17.0', 'en', '[]', ?1)`,
    )
      .bind(old)
      .run();

    await d1Diagnostics(env.DB).record([report()], new Date('2026-03-01T00:00:00.000Z'));

    const { results } = await env.DB.prepare('SELECT message FROM diagnostic_report').all();
    expect(results).toEqual([{ message: 'boom' }]);
  });

  it('keeps a row that is inside the window', async () => {
    const recent = new Date('2026-02-20T00:00:00.000Z').toISOString();
    await env.DB.prepare(
      `INSERT INTO diagnostic_report
         (id, kind, message, app_version, os_version, locale, breadcrumbs, reported_at)
       VALUES ('recent', 'crash', 'yesterday', '0.9.0', 'ios 17.0', 'en', '[]', ?1)`,
    )
      .bind(recent)
      .run();

    await d1Diagnostics(env.DB).record([report()], new Date('2026-03-01T00:00:00.000Z'));

    const count = await env.DB.prepare('SELECT count(*) c FROM diagnostic_report').first('c');
    expect(count).toBe(2);
  });
});

describe('the quota counter', () => {
  it('rolls over at UTC midnight rather than on the phone`s day', async () => {
    const quota = kvReportQuota(env.RESULTS_CACHE);
    const limit = 3;

    expect(await quota.consume(DEVICE, 3, limit, new Date('2026-03-01T23:59:00.000Z'))).toBe(3);
    expect(await quota.consume(DEVICE, 1, limit, new Date('2026-03-01T23:59:30.000Z'))).toBe(0);
    expect(await quota.consume(DEVICE, 1, limit, new Date('2026-03-02T00:00:01.000Z'))).toBe(1);
  });

  it('grants what is left rather than nothing when a batch overshoots', async () => {
    const quota = kvReportQuota(env.RESULTS_CACHE);
    const at = new Date('2026-03-01T10:00:00.000Z');

    expect(await quota.consume(DEVICE, 8, 10, at)).toBe(8);
    expect(await quota.consume(DEVICE, 8, 10, at)).toBe(2);
  });

  it('treats a corrupted counter as nothing spent', async () => {
    await env.RESULTS_CACHE.put(`diag:${DEVICE}:2026-03-01`, 'not a number');

    const granted = await kvReportQuota(env.RESULTS_CACHE).consume(
      DEVICE,
      1,
      5,
      new Date('2026-03-01T10:00:00.000Z'),
    );

    expect(granted).toBe(1);
  });
});

describe('reportDiagnostics', () => {
  /**
   * Core, with fakes instead of bindings — which is the placement rule: a
   * product rule that needs a binding to be tested is in the wrong file.
   */
  it('writes only as many as the quota granted, oldest first', async () => {
    const written: DiagnosticReport[] = [];

    const result = await reportDiagnostics(
      DEVICE,
      [report({ message: 'first' }), report({ message: 'second' }), report({ message: 'third' })],
      {
        diagnostics: {
          record: async (reports) => {
            written.push(...reports);
          },
        },
        quota: { consume: async () => 2 },
        now: () => new Date('2026-03-01T00:00:00.000Z'),
      },
    );

    expect(result).toEqual({ accepted: 2 });
    expect(written.map((r) => r.message)).toEqual(['first', 'second']);
  });

  it('does not touch the store when the quota is spent', async () => {
    let called = false;

    const result = await reportDiagnostics(DEVICE, [report()], {
      diagnostics: {
        record: async () => {
          called = true;
        },
      },
      quota: { consume: async () => 0 },
      now: () => new Date(),
    });

    expect(result).toEqual({ accepted: 0 });
    expect(called).toBe(false);
  });
});
