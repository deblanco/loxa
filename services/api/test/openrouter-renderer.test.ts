import { afterEach, describe, expect, it, vi } from 'vitest';
import { openRouterHairRenderer } from '../src/adapters/openrouter/hair-renderer';
import { PhotoRejectedError, RendererUnavailableError } from '../src/core/errors';

/**
 * The fallback adapter, branch by branch.
 *
 * It is only ever reached when Vertex has already failed, which means it is the
 * path least likely to be exercised by hand and most likely to be broken
 * without anybody noticing until the day it matters.
 *
 * `transient` is asserted as well as the throw: it is what decides whether a
 * third provider would be asked, and today it is the only record of *why* a
 * render failed that survives the trip to `adapters/http`.
 */

const request = { imageBase64: 'aGVsbG8=', stylePrompt: 'a bob', colorPrompt: 'caramel' };

function renderer() {
  return openRouterHairRenderer({
    apiKey: 'sk-or-test',
    model: 'google/gemini-3.1-flash-lite-image',
  });
}

function intercept(answer: () => Response | Promise<Response>) {
  const requests: { url: string; body?: string; headers?: HeadersInit }[] = [];

  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    requests.push({ url, body: init?.body as string | undefined, headers: init?.headers });
    return await answer();
  });

  return requests;
}

const image = (over: Record<string, unknown> = {}) =>
  Response.json({ data: [{ b64_json: 'RENDERED', media_type: 'image/jpeg', ...over }] });

/** Whatever the adapter threw, so its `transient` flag can be read. */
async function thrownBy(port: ReturnType<typeof renderer>) {
  try {
    await port.render(request);
  } catch (err) {
    return err;
  }
  throw new Error('expected a throw');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the happy path', () => {
  it('returns the image', async () => {
    intercept(() => image());
    await expect(renderer().render(request)).resolves.toEqual({ imageBase64: 'RENDERED' });
  });

  it('asks for the same model, frame and format as Vertex', async () => {
    // "Same model" is the whole premise of the fallback: a different one would
    // return a different face with the right haircut, which is the one thing
    // this app must not do.
    const requests = intercept(() => image());
    await renderer().render(request);

    const body = JSON.parse(requests.at(-1)!.body!);
    expect(requests.at(-1)!.url).toBe('https://openrouter.ai/api/v1/images');
    expect(body.model).toBe('google/gemini-3.1-flash-lite-image');
    expect(body.aspect_ratio).toBe('9:16');
    expect(body.output_format).toBe('jpeg');
    expect(body.n).toBe(1);
  });

  it('sends the photo as a data URL and the prompt as text', async () => {
    const requests = intercept(() => image());
    await renderer().render(request);

    const body = JSON.parse(requests.at(-1)!.body!);
    expect(body.prompt).toContain('a bob');
    expect(body.prompt).toContain('caramel');
    expect(body.input_references[0].image_url.url).toBe('data:image/jpeg;base64,aGVsbG8=');
  });
});

describe('the failures that are ours', () => {
  it('reports an unreachable host, and says another provider could try', async () => {
    intercept(() => {
      throw new Error('ECONNRESET');
    });
    const err = await thrownBy(renderer());
    expect(err).toBeInstanceOf(RendererUnavailableError);
    expect((err as RendererUnavailableError).transient).toBe(true);
  });

  it('marks a rate limit transient', async () => {
    intercept(() => new Response('rate limited', { status: 429 }));
    const err = await thrownBy(renderer());
    expect((err as RendererUnavailableError).transient).toBe(true);
    expect((err as Error).message).toMatch(/429/);
  });

  it('marks an upstream outage transient', async () => {
    intercept(() => new Response('bad gateway', { status: 502 }));
    expect((await thrownBy(renderer()) as RendererUnavailableError).transient).toBe(true);
  });

  it('does not mark our own bad request transient', async () => {
    // A 400 is the same request wherever it is sent. Retrying it elsewhere
    // buys a second bill and nothing else.
    intercept(() => new Response('no such model', { status: 400 }));
    const err = await thrownBy(renderer());
    expect(err).toBeInstanceOf(RendererUnavailableError);
    expect((err as RendererUnavailableError).transient).toBe(false);
  });

  it('does not mark a rejected key transient', async () => {
    intercept(() => new Response('no auth credentials found', { status: 401 }));
    expect((await thrownBy(renderer()) as RendererUnavailableError).transient).toBe(false);
  });

  it('reports an unreadable body', async () => {
    intercept(
      () => new Response('<html>504</html>', { headers: { 'content-type': 'application/json' } }),
    );
    await expect(renderer().render(request)).rejects.toThrow(/unreadable JSON/);
  });

  it('reports a 200 with no image in it', async () => {
    intercept(() => Response.json({ data: [] }));
    await expect(renderer().render(request)).rejects.toThrow(/returned no image/);
  });

  it('reports an error body carried on a 200', async () => {
    intercept(() => Response.json({ error: { code: 'upstream_error', message: 'provider down' } }));
    await expect(renderer().render(request)).rejects.toThrow(/provider down/);
  });

  it('refuses a PNG rather than writing one to a .jpg', async () => {
    // Same guard as the Vertex adapter, for the same reason: the client writes
    // these bytes straight to `${id}.jpg`.
    intercept(() => image({ media_type: 'image/png' }));
    await expect(renderer().render(request)).rejects.toThrow(/expected image\/jpeg/);
  });
});

describe('the failures that are the photo', () => {
  it('reports a moderation block as a rejected photo', async () => {
    // 403 is OpenRouter's verdict on the input, which is what Vertex calls a
    // blockReason. The app tells the user to take another photo, and must not
    // tell them to try again later.
    intercept(() => new Response('flagged by moderation', { status: 403 }));
    await expect(renderer().render(request)).rejects.toThrow(PhotoRejectedError);
  });
});
