import { afterEach, describe, expect, it, vi } from 'vitest';
import { fallbackRenderer } from '../src/adapters/fallback-renderer';
import { resetTokenCache } from '../src/adapters/vertex/auth';
import { rendererFor } from '../src/composition';
import { PhotoRejectedError, RendererUnavailableError } from '../src/core/errors';
import type { Env } from '../src/env';
import { fakeRenderer } from './fakes';
import { TEST_SA_KEY } from './service-account';

/**
 * Which failures are worth a second provider, and which are worth a second bill.
 *
 * Every case here is about that one question. The composite is four lines; the
 * cost of getting it wrong is either a 502 the user did not need to see, or a
 * render charged twice for a request that was never going to work.
 */

const request = { imageBase64: 'aGVsbG8=', stylePrompt: 'a bob', colorPrompt: 'caramel' };

describe('the fallback', () => {
  it('answers from the primary and never asks the secondary', async () => {
    const primary = fakeRenderer('FROM-VERTEX');
    const secondary = fakeRenderer('FROM-OPENROUTER');

    await expect(fallbackRenderer(primary.port, secondary.port).render(request)).resolves.toEqual({
      imageBase64: 'FROM-VERTEX',
    });
    expect(secondary.calls).toHaveLength(0);
  });

  it('falls through when the primary is rate-limited', async () => {
    // The case this exists for: Vertex's per-minute quota, which is not the
    // user's problem and not a reason to hand back a 502.
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const primary = fakeRenderer(new RendererUnavailableError('returned 429', true));
    const secondary = fakeRenderer('FROM-OPENROUTER');

    await expect(fallbackRenderer(primary.port, secondary.port).render(request)).resolves.toEqual({
      imageBase64: 'FROM-OPENROUTER',
    });
    expect(secondary.calls).toEqual([request]);
    vi.restoreAllMocks();
  });

  it('does not ask a second provider about a rejected photo', async () => {
    // A safety block is a verdict on the photograph. The same model on another
    // provider returns the same verdict, one billed call and several seconds
    // later, and the user waits longer to be told the same thing.
    const primary = fakeRenderer(new PhotoRejectedError('IMAGE_SAFETY'));
    const secondary = fakeRenderer('FROM-OPENROUTER');

    await expect(fallbackRenderer(primary.port, secondary.port).render(request)).rejects.toThrow(
      PhotoRejectedError,
    );
    expect(secondary.calls).toHaveLength(0);
  });

  it('does not ask a second provider about our own bad request', async () => {
    // A 400, a revoked key, a reply with no picture in it. Sending the
    // identical request somewhere else bills it twice and hides the fault.
    const primary = fakeRenderer(new RendererUnavailableError('returned 400: bad model'));
    const secondary = fakeRenderer('FROM-OPENROUTER');

    await expect(fallbackRenderer(primary.port, secondary.port).render(request)).rejects.toThrow(
      /400/,
    );
    expect(secondary.calls).toHaveLength(0);
  });

  it('surfaces the secondary failure when both are down', async () => {
    // The last word on the request, so the status code is built from what
    // actually ended it. Core refunds on the throw either way.
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const primary = fakeRenderer(new RendererUnavailableError('vertex returned 429', true));
    const secondary = fakeRenderer(new RendererUnavailableError('openrouter returned 503', true));

    await expect(fallbackRenderer(primary.port, secondary.port).render(request)).rejects.toThrow(
      /openrouter returned 503/,
    );
    vi.restoreAllMocks();
  });
});

describe('the wiring', () => {
  // `rendererFor` is the only place the two adapters are put together, and the
  // route suite deliberately runs with the fallback off — so without this, the
  // one line that decides whether Loxa has a second provider at all is never
  // executed until production needs it.

  const base = {
    GOOGLE_PROJECT_ID: 'loxa-test',
    IMAGE_MODEL: 'gemini-3.1-flash-lite-image',
    GOOGLE_SA_KEY: TEST_SA_KEY,
    OPENROUTER_IMAGE_MODEL: 'google/gemini-3.1-flash-lite-image',
  } as unknown as Env;

  /** Token endpoint answers; Vertex is rate-limited; OpenRouter has the picture. */
  function intercept() {
    const urls: string[] = [];

    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      urls.push(url);

      if (url.startsWith('https://oauth2.test/token')) {
        return Response.json({ access_token: 'test-token', expires_in: 3600 });
      }
      if (url.includes('aiplatform.googleapis.com')) {
        return new Response('quota exceeded', { status: 429 });
      }
      return Response.json({ data: [{ b64_json: 'FROM-OPENROUTER', media_type: 'image/jpeg' }] });
    });

    return urls;
  }

  afterEach(() => {
    resetTokenCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders through OpenRouter when Vertex is rate-limited', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const urls = intercept();

    await expect(rendererFor({ ...base, OPENROUTER_API_KEY: 'sk-or-test' }).render(request)).resolves.toEqual({
      imageBase64: 'FROM-OPENROUTER',
    });
    expect(urls.filter((u) => u.includes('openrouter.ai'))).toHaveLength(1);
  });

  it('is one provider with no key, exactly as before there were two', async () => {
    // A supported state, not a degraded one. Nothing reaches OpenRouter and the
    // 429 surfaces as it always did.
    const urls = intercept();

    await expect(rendererFor(base).render(request)).rejects.toThrow(/429/);
    expect(urls.filter((u) => u.includes('openrouter.ai'))).toHaveLength(0);
  });

  it('stays off when the key is set but the model is not', async () => {
    // An unnamed model cannot be called, and half a configuration should fail
    // loudly at Vertex rather than quietly at a 404 on the fallback.
    const urls = intercept();
    const env = { ...base, OPENROUTER_API_KEY: 'sk-or-test', OPENROUTER_IMAGE_MODEL: undefined };

    await expect(rendererFor(env as Env).render(request)).rejects.toThrow(/429/);
    expect(urls.filter((u) => u.includes('openrouter.ai'))).toHaveLength(0);
  });
});
