import {
  purchaseSyncRequestSchema,
  tryOnRequestSchema,
  type ApiErrorCode,
} from '@loxa/shared';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { buildCreditsDeps, buildSyncDeps, buildTryOnDeps } from '../../composition';
import {
  OutOfCreditsError,
  PhotoRejectedError,
  RendererUnavailableError,
  UnknownStyleError,
} from '../../core/errors';
import { readCatalogue } from '../r2/catalogue';
import { getCredits } from '../../core/get-credits';
import { syncPurchases } from '../../core/sync-purchases';
import { tryOn } from '../../core/try-on';
import type { Env } from '../../env';
import { deviceIdFrom, devPremiumFrom } from './device';

/**
 * The only place in this Worker that knows what an HTTP status code is.
 *
 * Handlers do four things and nothing else: read the device id, parse the body
 * against a schema from `@loxa/shared`, call a use case, and translate a domain
 * error into a status. Any product logic that appears here is in the wrong file.
 */

type ErrorStatus = 400 | 402 | 422 | 502 | 500;

const STATUS: Record<ApiErrorCode, ErrorStatus> = {
  bad_request: 400,
  // 402 rather than 429: the user is not going too fast, they are out of
  // credits, and the fix is a purchase rather than a wait.
  out_of_credits: 402,
  photo_rejected: 422,
  renderer_unavailable: 502,
  internal: 500,
};

function fail(code: ApiErrorCode, message: string) {
  return Response.json({ code, message }, { status: STATUS[code] });
}

/** Domain error to wire error. Anything unrecognised is ours, and is a 500. */
function translate(err: unknown): Response {
  if (err instanceof UnknownStyleError) return fail('bad_request', err.message);
  if (err instanceof OutOfCreditsError) return fail('out_of_credits', err.message);
  if (err instanceof PhotoRejectedError) return fail('photo_rejected', err.message);
  if (err instanceof RendererUnavailableError) return fail('renderer_unavailable', err.message);

  console.error('unhandled error', err);
  return fail('internal', 'something went wrong');
}

export function createApp() {
  const app = new Hono<{ Bindings: Env }>();

  app.use(
    '*',
    cors({
      origin: '*',
      allowHeaders: ['Content-Type', 'X-Device-Id', 'X-Dev-Premium'],
    }),
  );

  // Unversioned on purpose: it is for uptime checks, not for the app, and it
  // must keep answering across every future /v2.
  app.get('/health', (c) => c.json({ ok: true }));

  /**
   * The published catalogue.
   *
   * Unmetered, and the one route with no device id. It is the same answer for
   * everybody, it costs a bucket read rather than a model call, and the app
   * needs it before onboarding has minted an identity — a credit check here
   * would gate the catalogue behind the thing the catalogue is used to sell.
   *
   * A day of cache and an etag, so the edge absorbs the load and a client that
   * already has the current manifest pays 304 bytes for the check. The app
   * keeps its own 24h copy on top of this; both windows are the same number by
   * agreement, not by accident.
   */
  app.get('/v1/catalogue', async (c) => {
    const { catalogue, etag } = await readCatalogue(c.env.ASSETS);

    if (etag && c.req.header('If-None-Match') === etag) {
      return new Response(null, {
        status: 304,
        headers: { 'Cache-Control': 'public, max-age=86400', ETag: etag },
      });
    }

    return Response.json(catalogue, {
      headers: {
        'Cache-Control': 'public, max-age=86400',
        ...(etag ? { ETag: etag } : {}),
      },
    });
  });

  app.get('/v1/credits', async (c) => {
    const deviceId = deviceIdFrom(c);
    if (!deviceId) return fail('bad_request', 'missing or malformed X-Device-Id');

    try {
      return Response.json(
        await getCredits(deviceId, buildCreditsDeps(c.env, devPremiumFrom(c))),
      );
    } catch (err) {
      return translate(err);
    }
  });

  app.post('/v1/tryon', async (c) => {
    const deviceId = deviceIdFrom(c);
    if (!deviceId) return fail('bad_request', 'missing or malformed X-Device-Id');

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return fail('bad_request', 'body is not JSON');
    }

    const parsed = tryOnRequestSchema.safeParse(body);
    if (!parsed.success) return fail('bad_request', parsed.error.issues[0]?.message ?? 'invalid body');

    try {
      const result = await tryOn(
        { deviceId, ...parsed.data },
        buildTryOnDeps(c.env, devPremiumFrom(c)),
      );
      return Response.json(result);
    } catch (err) {
      return translate(err);
    }
  });

  app.post('/v1/purchases/sync', async (c) => {
    const deviceId = deviceIdFrom(c);
    if (!deviceId) return fail('bad_request', 'missing or malformed X-Device-Id');

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return fail('bad_request', 'body is not JSON');
    }

    const parsed = purchaseSyncRequestSchema.safeParse(body);
    if (!parsed.success) return fail('bad_request', parsed.error.issues[0]?.message ?? 'invalid body');

    try {
      const result = await syncPurchases(
        deviceId,
        parsed.data.transactionIds,
        buildSyncDeps(c.env, devPremiumFrom(c)),
      );
      return Response.json(result);
    } catch (err) {
      return translate(err);
    }
  });

  return app;
}
