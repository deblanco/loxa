import {
  apiErrorSchema,
  catalogueResponseSchema,
  creditsResponseSchema,
  purchaseSyncResponseSchema,
  tryOnResponseSchema,
  type ApiErrorCode,
  type CatalogueResponse,
  type CreditsResponse,
  type PurchaseSyncResponse,
  type TryOnResponse,
} from '@loxa/shared';
import { isDevPremium } from '@/dev/premium';
import { deviceId } from './device-id';

/**
 * The only thing in the app that talks to the network.
 *
 * Every response is parsed with the schema from `@loxa/shared` rather than
 * cast: a Worker that has moved on is a bug we want as a thrown error at the
 * boundary, not as `undefined` three screens later.
 */

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';

/**
 * Thirty seconds.
 *
 * A render is a single synchronous call to an image model, and the ones that
 * are going to succeed come back well inside this. Past it, something is wrong
 * and the user is staring at a progress bar that will never finish — better to
 * say so and let them try again, since the credit was refunded server-side.
 */
const REQUEST_TIMEOUT_MS = 30_000;

// Re-exported so callers have one import for "talking to the Worker". The
// implementation lives apart because where the id is stored is a durability
// decision, not a networking one — see device-id.ts.
export { deviceId };

/** Thrown for every non-2xx. `code` is what the app branches on. */
export class ApiRequestError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(
  path: string,
  parse: (body: unknown) => T,
  init: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': await deviceId(),
        // Only when the dev toggle asks for it. Sending it unconditionally in
        // development made every build a subscriber and put the free tier and
        // the paywall out of reach. `isDevPremium` is false outside __DEV__, so
        // a release build never sends the header at all.
        ...((await isDevPremium()) ? { 'X-Dev-Premium': '1' } : {}),
        ...init.headers,
      },
    });
  } catch (err) {
    // An abort and a dead network are the same thing to the user: no answer.
    throw new ApiRequestError(
      'internal',
      err instanceof Error ? err.message : 'could not reach the server',
    );
  } finally {
    clearTimeout(timeout);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw new ApiRequestError(
      parsed.success ? parsed.data.code : 'internal',
      parsed.success ? parsed.data.message : `request failed with ${response.status}`,
    );
  }

  return parse(body);
}

/**
 * The published catalogue.
 *
 * The one call that needs no identity — it is the same answer for everybody,
 * and the app asks for it before onboarding has minted a device id. The shared
 * request path sends the header anyway; the Worker ignores it, which is cheaper
 * than a second code path here.
 */
export async function fetchCatalogue(): Promise<CatalogueResponse> {
  return await request('/v1/catalogue', (body) => catalogueResponseSchema.parse(body));
}

export async function fetchCredits(): Promise<CreditsResponse> {
  return await request('/v1/credits', (body) => creditsResponseSchema.parse(body));
}

export async function tryOn(input: {
  imageBase64: string;
  styleId: string;
  colorId: string;
}): Promise<TryOnResponse> {
  return await request('/v1/tryon', (body) => tryOnResponseSchema.parse(body), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function syncPurchases(transactionIds: string[]): Promise<PurchaseSyncResponse> {
  return await request('/v1/purchases/sync', (body) => purchaseSyncResponseSchema.parse(body), {
    method: 'POST',
    body: JSON.stringify({ transactionIds }),
  });
}
