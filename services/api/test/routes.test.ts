import { SELF, env } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetTokenCache } from '../src/adapters/vertex/auth';
import schema from '../schema.sql?raw';

/**
 * The Worker end to end, inside workerd, against real D1 and KV.
 *
 * Only the two outbound calls are faked — Google's token endpoint and Vertex —
 * because everything else here is exactly the behaviour worth testing for real:
 * the upsert, the primary-key collision, the KV round trip.
 */

const PHOTO = 'aGVsbG8=';
const DEVICE = 'device-abcdef01';

const body = (over: Record<string, unknown> = {}) => ({
  imageBase64: PHOTO,
  styleId: 'blunt-bob',
  colorId: 'caramel',
  ...over,
});

function post(path: string, payload: unknown, headers: Record<string, string> = {}) {
  return SELF.fetch(`https://loxa.test${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Device-Id': DEVICE, ...headers },
    body: JSON.stringify(payload),
  });
}

/**
 * Intercept the two hosts the Worker reaches out to.
 *
 * `vertex` decides what the image model answers. Returning a counter as well,
 * because "was the model called at all" is how the cache test proves a hit —
 * the response body alone cannot tell a hit from a fresh render.
 */
function interceptVertex(vertex: () => Response) {
  let calls = 0;

  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (url.startsWith('https://oauth2.test/token')) {
      return Response.json({ access_token: 'test-token', expires_in: 3600 });
    }
    if (url.includes('aiplatform.googleapis.com')) {
      calls += 1;
      return vertex();
    }
    throw new Error(`unexpected fetch to ${url}`);
  });

  return { calls: () => calls };
}

const imageAnswer = (data = 'RENDERED') =>
  Response.json({
    candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/jpeg', data } }] } }],
  });

/**
 * The real schema.sql, imported rather than retyped.
 *
 * A hand-copied CREATE TABLE in a test file drifts from the one that ships, and
 * the drift shows up as a suite that passes against a table production does not
 * have. D1's `exec` wants one statement per line and no comments, so the file
 * is stripped and re-joined here.
 */
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
  await env.DB.exec('DELETE FROM device_credits');
  await env.DB.exec('DELETE FROM credit_grant');

  // KV outlives D1 between tests, and a leftover render answers the next test's
  // request for free — which reads as "no credit was spent" and quietly passes
  // the wrong assertion.
  const cached = await env.RESULTS_CACHE.list();
  await Promise.all(cached.keys.map((key) => env.RESULTS_CACHE.delete(key.name)));

  resetTokenCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /health', () => {
  it('answers without a device id', async () => {
    const response = await SELF.fetch('https://loxa.test/health');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});

describe('GET /v1/credits', () => {
  it('needs a device id', async () => {
    const response = await SELF.fetch('https://loxa.test/v1/credits');
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ code: 'bad_request' }),
    );
  });

  it('rejects a device id that is too short to be ours', async () => {
    const response = await SELF.fetch('https://loxa.test/v1/credits', {
      headers: { 'X-Device-Id': 'abc' },
    });
    expect(response.status).toBe(400);
  });

  it('gives a new free device its one credit', async () => {
    const response = await SELF.fetch('https://loxa.test/v1/credits', {
      headers: { 'X-Device-Id': DEVICE },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ creditsLeft: 1, cap: 0, plan: 'free' }),
    );
  });

  it('treats a dev-premium request as a subscriber', async () => {
    const response = await SELF.fetch('https://loxa.test/v1/credits', {
      headers: { 'X-Device-Id': DEVICE, 'X-Dev-Premium': '1' },
    });
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ cap: 20, plan: 'weekly' }),
    );
  });
});

describe('POST /v1/tryon', () => {
  it('renders and spends the free credit', async () => {
    interceptVertex(() => imageAnswer());

    const response = await post('/v1/tryon', body());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      imageBase64: 'RENDERED',
      creditsLeft: 0,
      cached: false,
    });

    const row = await env.DB.prepare('SELECT free_used FROM device_credits WHERE device_id = ?')
      .bind(DEVICE)
      .first<{ free_used: number }>();
    expect(row?.free_used).toBe(1);
  });

  it('serves the second identical request from the cache, free', async () => {
    const vertex = interceptVertex(() => imageAnswer());

    await post('/v1/tryon', body(), { 'X-Dev-Premium': '1' });
    const second = await post('/v1/tryon', body(), { 'X-Dev-Premium': '1' });

    await expect(second.json()).resolves.toEqual(
      expect.objectContaining({ cached: true, imageBase64: 'RENDERED' }),
    );
    // The model was called once, for the first request only.
    expect(vertex.calls()).toBe(1);
  });

  it('answers 402 once the credits are gone', async () => {
    interceptVertex(() => imageAnswer());

    await post('/v1/tryon', body());
    // A different photo, so the cache cannot answer it.
    const second = await post('/v1/tryon', body({ imageBase64: 'd29ybGQ=' }));

    expect(second.status).toBe(402);
    await expect(second.json()).resolves.toEqual(
      expect.objectContaining({ code: 'out_of_credits' }),
    );
  });

  it('refunds the credit when the model is down', async () => {
    interceptVertex(() => new Response('upstream on fire', { status: 503 }));

    const response = await post('/v1/tryon', body());
    expect(response.status).toBe(502);

    const credits = await SELF.fetch('https://loxa.test/v1/credits', {
      headers: { 'X-Device-Id': DEVICE },
    });
    await expect(credits.json()).resolves.toEqual(
      expect.objectContaining({ creditsLeft: 1 }),
    );
  });

  it('reports a blocked photo as the user problem it is', async () => {
    interceptVertex(() => Response.json({ promptFeedback: { blockReason: 'SAFETY' } }));

    const response = await post('/v1/tryon', body());
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ code: 'photo_rejected' }),
    );
  });

  it('refuses a style outside the catalogue', async () => {
    const response = await post('/v1/tryon', body({ styleId: 'mullet' }));
    expect(response.status).toBe(400);
  });

  it('refuses a body that is not JSON', async () => {
    const response = await SELF.fetch('https://loxa.test/v1/tryon', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Device-Id': DEVICE },
      body: 'not json',
    });
    expect(response.status).toBe(400);
  });

  it('refuses a render that comes back as a PNG', async () => {
    // The port promises JPEG and the client writes the bytes to `${id}.jpg`.
    interceptVertex(() =>
      Response.json({
        candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'X' } }] } }],
      }),
    );

    const response = await post('/v1/tryon', body());
    expect(response.status).toBe(502);
  });
});

describe('POST /v1/purchases/sync', () => {
  it('grants nothing without a way to verify', async () => {
    // No RevenueCat key in this environment, so the stub answers, and the stub
    // verifies nothing. A deployment that cannot check a purchase must not
    // assume one.
    const response = await post('/v1/purchases/sync', { transactionIds: ['tx_1'] });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ granted: 0 }),
    );
  });

  it('refuses an empty batch', async () => {
    const response = await post('/v1/purchases/sync', { transactionIds: [] });
    expect(response.status).toBe(400);
  });
});
