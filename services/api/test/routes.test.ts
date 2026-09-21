import { SELF, env } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetTokenCache } from '../src/adapters/vertex/auth';
import { networkKey } from '../src/core/cache-key';
import { NEW_DEVICES_PER_NETWORK_PER_DAY as LIMIT } from '../src/core/network-limits';
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
function interceptVertex(vertex: () => Response, analysis?: () => Response) {
  let calls = 0;
  let analyses = 0;

  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (url.startsWith('https://oauth2.test/token')) {
      return Response.json({ access_token: 'test-token', expires_in: 3600 });
    }
    // Split on the model, not on the host: the analysis route calls Vertex too,
    // and counting one as the other makes the cache test above pass for the
    // wrong reason — it would read as a render nobody made.
    if (url.includes(`models/${ANALYSIS_MODEL}:`)) {
      analyses += 1;
      return analysis ? analysis() : analysisAnswer();
    }
    if (url.includes('aiplatform.googleapis.com')) {
      calls += 1;
      return vertex();
    }
    throw new Error(`unexpected fetch to ${url}`);
  });

  return { calls: () => calls, analyses: () => analyses };
}

/** What the test bindings call the analysis model. */
const ANALYSIS_MODEL = 'gemini-test-text';

/** One believable answer about a face. */
const analysisAnswer = (styleId = 'blunt-bob') =>
  Response.json({
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                faceShape: 'oval',
                cuts: [{ styleId, reason: 'A level line answers a soft jaw.' }],
              }),
            },
          ],
        },
      },
    ],
  });

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

describe('GET /v1/catalogue', () => {
  const MANIFEST = {
    version: 1,
    styles: [
      {
        id: 'blunt-bob',
        name: 'Blunt bob',
        tiles: [],
        colors: [{ id: 'caramel', heroes: ['styles/blunt-bob/caramel/0.jpg'] }],
      },
    ],
    colors: [{ id: 'caramel', name: 'Caramel', hex: '#a46c3c' }],
    defaults: { styleId: 'blunt-bob', colorId: 'caramel' },
  };

  afterEach(async () => {
    await env.ASSETS.delete('catalogue.json');
  });

  it('needs no device id — the app asks before it has one', async () => {
    const response = await SELF.fetch('https://loxa.test/v1/catalogue');
    expect(response.status).toBe(200);
  });

  it('serves the manifest in the bucket', async () => {
    await env.ASSETS.put('catalogue.json', JSON.stringify(MANIFEST));

    const response = await SELF.fetch('https://loxa.test/v1/catalogue');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(MANIFEST);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');
    expect(response.headers.get('ETag')).toBeTruthy();
  });

  it('falls back to the shipped catalogue when the bucket is empty', async () => {
    // A fresh deploy against a bucket nobody has uploaded to must still answer.
    const response = await SELF.fetch('https://loxa.test/v1/catalogue');
    const body = (await response.json()) as { styles: unknown[]; version: number };
    expect(response.status).toBe(200);
    expect(body.version).toBe(1);
    expect(body.styles.length).toBe(24);
    // No etag: the fallback's bytes change with every deploy, so promising that
    // the same string means the same content would be a lie.
    expect(response.headers.get('ETag')).toBeNull();
  });

  it('falls back rather than failing when the manifest is malformed', async () => {
    // The app in someone's hand cannot fix our upload, and the catalogue we
    // shipped is a usable answer. Degraded, not broken.
    await env.ASSETS.put('catalogue.json', JSON.stringify({ version: 9, styles: [] }));

    const response = await SELF.fetch('https://loxa.test/v1/catalogue');
    const body = (await response.json()) as { styles: unknown[] };
    expect(response.status).toBe(200);
    expect(body.styles.length).toBe(24);
  });

  it('falls back when the object is not JSON at all', async () => {
    await env.ASSETS.put('catalogue.json', 'not json');

    const response = await SELF.fetch('https://loxa.test/v1/catalogue');
    expect(response.status).toBe(200);
  });

  it('answers 304 to a client that already has this manifest', async () => {
    await env.ASSETS.put('catalogue.json', JSON.stringify(MANIFEST));

    const first = await SELF.fetch('https://loxa.test/v1/catalogue');
    const etag = first.headers.get('ETag')!;

    const second = await SELF.fetch('https://loxa.test/v1/catalogue', {
      headers: { 'If-None-Match': etag },
    });
    expect(second.status).toBe(304);
    expect(second.headers.get('ETag')).toBe(etag);
  });

  it('sends the body when the etag does not match', async () => {
    await env.ASSETS.put('catalogue.json', JSON.stringify(MANIFEST));

    const response = await SELF.fetch('https://loxa.test/v1/catalogue', {
      headers: { 'If-None-Match': '"stale"' },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(MANIFEST);
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
    const response = await post('/v1/tryon', body({ styleId: 'not-a-real-style' }));
    expect(response.status).toBe(400);
  });

  it('refuses a body that announces itself as too large to parse', async () => {
    const vertex = interceptVertex(() => imageAnswer());

    const response = await SELF.fetch('https://loxa.test/v1/tryon', {
      method: 'POST',
      headers: {
        'X-Device-Id': DEVICE,
        'content-type': 'application/json',
        'content-length': String(10 * 1024 * 1024),
      },
      body: JSON.stringify(body()),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ code: 'bad_request', message: 'the photo is too large' }),
    );
    expect(vertex.calls()).toBe(0);
  });

  it('lets one credit buy one render when two requests race for it', async () => {
    // The whole race, through the real Worker and the real database: a free
    // device, two different photos sent together. One 200, one 402, one render.
    const vertex = interceptVertex(() => imageAnswer());

    const responses = await Promise.all([
      post('/v1/tryon', body()),
      post('/v1/tryon', body({ imageBase64: 'd29ybGQ=' })),
    ]);

    expect(responses.map((r) => r.status).sort()).toEqual([200, 402]);
    expect(vertex.calls()).toBe(1);

    const row = await env.DB.prepare('SELECT free_used FROM device_credits WHERE device_id = ?')
      .bind(DEVICE)
      .first<{ free_used: number }>();
    expect(row?.free_used).toBe(1);
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

describe('POST /v1/analysis', () => {
  const photos = { photos: ['aGVsbG8='] };

  it('answers a device that has a credit, and takes none of it', async () => {
    interceptVertex(() => imageAnswer());

    const response = await post('/v1/analysis', photos);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      faceShape: 'oval',
      cuts: [{ styleId: 'blunt-bob', reason: 'A level line answers a soft jaw.' }],
      // The free credit, still there afterwards. This is the whole rule.
      creditsLeft: 1,
      cached: false,
    });

    const row = await env.DB.prepare('SELECT free_used FROM device_credits WHERE device_id = ?')
      .bind(DEVICE)
      .first<{ free_used: number }>();
    expect(row).toBeNull();
  });

  it('serves the second identical request from the cache', async () => {
    const vertex = interceptVertex(() => imageAnswer());

    await post('/v1/analysis', photos);
    const second = await post('/v1/analysis', photos);

    await expect(second.json()).resolves.toMatchObject({ cached: true });
    expect(vertex.analyses()).toBe(1);
  });

  it('refuses a device with nothing in the pot, and calls nobody', async () => {
    const vertex = interceptVertex(() => imageAnswer());
    // Spend the free credit on a render first, which is the ordinary way to
    // arrive here: the analysis is included with a balance, not sold.
    await post('/v1/tryon', body());

    const response = await post('/v1/analysis', { photos: ['d29ybGQ='] });
    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ code: 'out_of_credits' }),
    );
    expect(vertex.analyses()).toBe(0);
  });

  it('drops a cut the model invented and keeps the rest', async () => {
    interceptVertex(() => imageAnswer(), () =>
      Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    faceShape: 'oval',
                    cuts: [
                      { styleId: 'beehive', reason: 'Retro.' },
                      { styleId: 'pixie', reason: 'Balances a soft jaw.' },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
    );

    const response = await post('/v1/analysis', photos);
    await expect(response.json()).resolves.toMatchObject({
      cuts: [{ styleId: 'pixie', reason: 'Balances a soft jaw.' }],
    });
  });

  it('answers 502 when the model is down', async () => {
    interceptVertex(() => imageAnswer(), () => new Response('upstream on fire', { status: 503 }));

    const response = await post('/v1/analysis', photos);
    expect(response.status).toBe(502);
  });

  it('refuses a body with no photo, three photos, or nonsense in it', async () => {
    interceptVertex(() => imageAnswer());

    await expect(post('/v1/analysis', { photos: [] })).resolves.toMatchObject({ status: 400 });
    await expect(
      post('/v1/analysis', { photos: ['a', 'b', 'c'] }),
    ).resolves.toMatchObject({ status: 400 });
    await expect(post('/v1/analysis', { photos: ['not base64!'] })).resolves.toMatchObject({
      status: 400,
    });
  });

  it('refuses a body that announces itself as too large to parse', async () => {
    interceptVertex(() => imageAnswer());

    const response = await SELF.fetch('https://loxa.test/v1/analysis', {
      method: 'POST',
      headers: {
        'X-Device-Id': DEVICE,
        'content-type': 'application/json',
        'content-length': String(7 * 1024 * 1024),
      },
      body: JSON.stringify(photos),
    });
    expect(response.status).toBe(400);
  });

  it('wants a device id like every other metered-looking route', async () => {
    interceptVertex(() => imageAnswer());
    const response = await SELF.fetch('https://loxa.test/v1/analysis', {
      method: 'POST',
      body: JSON.stringify(photos),
    });
    expect(response.status).toBe(400);
  });
});

describe('CORS', () => {
  it('is not offered: nothing calls this Worker from a browser', async () => {
    const response = await SELF.fetch('https://loxa.test/v1/credits', {
      headers: { 'X-Device-Id': DEVICE, Origin: 'https://example.com' },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();

    const preflight = await SELF.fetch('https://loxa.test/v1/tryon', {
      method: 'OPTIONS',
      headers: { Origin: 'https://example.com', 'Access-Control-Request-Method': 'POST' },
    });
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

describe('limits on a client network', () => {
  const ip = (address: string) => ({ 'CF-Connecting-IP': address });
  const credits = (deviceId: string, headers: Record<string, string>) =>
    SELF.fetch('https://loxa.test/v1/credits', {
      headers: { 'X-Device-Id': deviceId, ...headers },
    }).then((r) => r.json() as Promise<{ creditsLeft: number }>);
  const newId = (n: number) => `device-farm${String(n).padStart(4, '0')}`;

  it('gives the first new ids from one address their free credit, and none after', async () => {
    for (let n = 1; n <= LIMIT; n++) {
      expect((await credits(newId(n), ip('198.51.100.1'))).creditsLeft).toBe(1);
    }
    expect((await credits(newId(LIMIT + 1), ip('198.51.100.1'))).creditsLeft).toBe(0);
    expect((await credits(newId(LIMIT + 2), ip('198.51.100.1'))).creditsLeft).toBe(0);
  });

  it('refuses the render an over-cap id would have had, without calling the model', async () => {
    const vertex = interceptVertex(() => imageAnswer());
    for (let n = 1; n <= LIMIT; n++) await credits(newId(n), ip('198.51.100.2'));

    const response = await post('/v1/tryon', body(), {
      ...ip('198.51.100.2'),
      'X-Device-Id': newId(LIMIT + 1),
    });

    expect(response.status).toBe(402);
    expect(vertex.calls()).toBe(0);
  });

  it('registers a new id the first time it tries on, not only when it asks for credits', async () => {
    // The farmer never calls /v1/credits: every request is a fresh id straight
    // at the render route.
    const vertex = interceptVertex(() => imageAnswer());
    const address = ip('198.51.100.3');

    for (let n = 1; n <= LIMIT; n++) {
      // A photo each, or the render cache answers the ones after the first.
      const photo = body({ imageBase64: btoa(`photo ${n}`) });
      const response = await post('/v1/tryon', photo, { ...address, 'X-Device-Id': newId(n) });
      expect(response.status).toBe(200);
    }
    const eleventh = await post('/v1/tryon', body({ imageBase64: btoa(`photo ${LIMIT + 1}`) }), {
      ...address,
      'X-Device-Id': newId(LIMIT + 1),
    });

    expect(eleventh.status).toBe(402);
    expect(vertex.calls()).toBe(LIMIT);
  });

  it('leaves a subscriber on a capped network with their allowance', async () => {
    for (let n = 1; n <= LIMIT; n++) await credits(newId(n), ip('198.51.100.4'));

    const capped = await credits(newId(LIMIT + 1), { ...ip('198.51.100.4'), 'X-Dev-Premium': '1' });
    expect(capped.creditsLeft).toBe(20);
  });

  it('counts an id once however often it comes back', async () => {
    for (let n = 0; n < 15; n++) await credits(newId(1), ip('198.51.100.5'));
    for (let n = 2; n <= LIMIT; n++) await credits(newId(n), ip('198.51.100.5'));

    expect((await credits(newId(LIMIT + 1), ip('198.51.100.5'))).creditsLeft).toBe(0);
    // The limit's worth of distinct ids so far: the first is still what it was.
    expect((await credits(newId(1), ip('198.51.100.5'))).creditsLeft).toBe(1);
  });

  it('keeps one address from spending another`s allowance', async () => {
    for (let n = 1; n <= LIMIT + 1; n++) await credits(newId(n), ip('198.51.100.6'));

    expect((await credits(newId(100), ip('198.51.100.7'))).creditsLeft).toBe(1);
  });

  it('counts an IPv6 network as its /64, so one household cannot mint thousands', async () => {
    for (let n = 1; n <= LIMIT; n++) {
      await credits(newId(n), ip(`2001:db8:1:2:${n.toString(16)}::1`));
    }

    expect((await credits(newId(LIMIT + 1), ip('2001:db8:1:2:ffff::1'))).creditsLeft).toBe(0);
    expect((await credits(newId(LIMIT + 2), ip('2001:db8:1:3::1'))).creditsLeft).toBe(1);
  });

  it('applies no limit to a request with no address', async () => {
    for (let n = 1; n <= LIMIT + 2; n++) {
      expect((await credits(newId(n), {})).creditsLeft).toBe(1);
    }
  });

  it('stores neither the address nor a device id beside it', async () => {
    const address = '198.51.100.8';
    await credits(newId(1), ip(address));
    await post('/v1/tryon', 'x', ip(address));

    const keys = (await env.RESULTS_CACHE.list()).keys.map((k) => k.name);
    const counters = keys.filter((k) => k.startsWith('newdev:') || k.startsWith('rate:'));
    expect(counters).toHaveLength(2);

    for (const name of counters) {
      expect(name).not.toContain(address);
      expect(name).not.toContain(newId(1));
      expect(await env.RESULTS_CACHE.get(name)).toMatch(/^\d+$/);
    }
  });

  describe('request rate', () => {
    const address = '198.51.100.9';

    async function spendMinute() {
      const minute = new Date().toISOString().slice(0, 16);
      await env.RESULTS_CACHE.put(`rate:${await networkKey(address)}:${minute}`, '60');
    }

    it('answers 429 to the sixty-first request in a minute on the try-on route', async () => {
      const vertex = interceptVertex(() => imageAnswer());
      await spendMinute();

      const response = await post('/v1/tryon', body(), ip(address));
      expect(response.status).toBe(429);
      await expect(response.json()).resolves.toEqual(
        expect.objectContaining({ code: 'rate_limited' }),
      );
      expect(vertex.calls()).toBe(0);
    });

    it('and on the analysis route, which shares the count', async () => {
      const vertex = interceptVertex(() => imageAnswer());
      await spendMinute();

      const response = await post('/v1/analysis', { photos: ['aGVsbG8='] }, ip(address));
      expect(response.status).toBe(429);
      expect(vertex.analyses()).toBe(0);
    });

    it('counts a request whatever becomes of it', async () => {
      // Rejected bodies count too: the limit is on asking, and it is checked
      // before the body is parsed.
      for (let n = 0; n < 3; n++) await post('/v1/tryon', 'x', ip(address));

      const minute = new Date().toISOString().slice(0, 16);
      await expect(
        env.RESULTS_CACHE.get(`rate:${await networkKey(address)}:${minute}`),
      ).resolves.toBe('3');
    });

    it('does not slow the credits route or another address', async () => {
      interceptVertex(() => imageAnswer());
      await spendMinute();

      const credits = await SELF.fetch('https://loxa.test/v1/credits', {
        headers: { 'X-Device-Id': DEVICE, ...ip(address) },
      });
      expect(credits.status).toBe(200);

      const other = await post('/v1/tryon', body(), ip('198.51.100.10'));
      expect(other.status).toBe(200);
    });
  });
});
