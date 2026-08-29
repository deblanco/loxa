import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoRejectedError, RendererUnavailableError } from '../src/core/errors';
import { parseServiceAccountKey, resetTokenCache } from '../src/adapters/vertex/auth';
import { vertexHairRenderer } from '../src/adapters/vertex/hair-renderer';
import { TEST_SA_KEY } from './service-account';

/**
 * The Vertex adapter's unhappy paths, one at a time.
 *
 * Every branch here ends in a throw, and which throw it is decides what the app
 * shows: `PhotoRejectedError` means "take another photo" and
 * `RendererUnavailableError` means "not your fault, try later". Getting the two
 * the wrong way round tells a user to retake a perfectly good photograph.
 */

const request = { imageBase64: 'aGVsbG8=', stylePrompt: 'a bob', colorPrompt: 'caramel' };

function renderer() {
  return vertexHairRenderer({
    credentials: parseServiceAccountKey(TEST_SA_KEY),
    projectId: 'loxa-test',
    model: 'gemini-3.1-flash-lite-image',
  });
}

/** Token endpoint answers; Vertex answers whatever the test says. */
function intercept(vertex: () => Response | Promise<Response>, token?: () => Response) {
  const requests: { url: string; body?: string }[] = [];

  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    requests.push({ url, body: init?.body as string | undefined });

    if (url.startsWith('https://oauth2.test/token')) {
      return token ? token() : Response.json({ access_token: 'test-token', expires_in: 3600 });
    }
    return await vertex();
  });

  return requests;
}

/** Whatever the adapter threw, so its `transient` flag can be read. */
async function thrownBy(port: ReturnType<typeof renderer>) {
  try {
    await port.render(request);
  } catch (err) {
    return err;
  }
  throw new Error('expected a throw');
}

const image = (over: Record<string, unknown> = {}) =>
  Response.json({
    candidates: [
      { content: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: 'RENDERED' } }] } },
    ],
    ...over,
  });

beforeEach(() => {
  resetTokenCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the happy path', () => {
  it('returns the image', async () => {
    intercept(() => image());
    await expect(renderer().render(request)).resolves.toEqual({ imageBase64: 'RENDERED' });
  });

  it('asks for 9:16 and for both modalities', async () => {
    // The aspect ratio is asked for in the config rather than in the prompt
    // because prompt-described framing is unreliable and every attempt is
    // billed. Both modalities because the model rejects an image-only request.
    const requests = intercept(() => image());
    await renderer().render(request);

    const body = JSON.parse(requests.at(-1)!.body!);
    expect(body.generationConfig.imageConfig.aspectRatio).toBe('9:16');
    expect(body.generationConfig.responseModalities).toEqual(['TEXT', 'IMAGE']);
  });

  it('sends the photo and the prompt in one turn', async () => {
    const requests = intercept(() => image());
    await renderer().render(request);

    const parts = JSON.parse(requests.at(-1)!.body!).contents[0].parts;
    expect(parts[0].text).toContain('a bob');
    expect(parts[0].text).toContain('caramel');
    expect(parts[1].inlineData.data).toBe('aGVsbG8=');
  });

  it('reuses the access token across renders', async () => {
    // One mint per hour per isolate, not one per render.
    const requests = intercept(() => image());
    const port = renderer();
    await port.render(request);
    await port.render(request);

    expect(requests.filter((r) => r.url.includes('oauth2.test')).length).toBe(1);
  });

  it('calls the global endpoint', async () => {
    const requests = intercept(() => image());
    await renderer().render(request);
    expect(requests.at(-1)!.url).toContain('/locations/global/');
  });
});

describe('the failures that are ours', () => {
  it('reports a dead token endpoint as unavailable', async () => {
    intercept(() => image(), () => new Response('invalid_grant', { status: 400 }));
    await expect(renderer().render(request)).rejects.toThrow(RendererUnavailableError);
  });

  it('reports a token endpoint that returns no token', async () => {
    intercept(() => image(), () => Response.json({}));
    await expect(renderer().render(request)).rejects.toThrow(RendererUnavailableError);
  });

  it('reports an unreachable model, and says another provider could try', async () => {
    // Nothing about the request has been judged, so the fallback is worth its
    // second bill. See adapters/fallback-renderer.ts.
    intercept(() => {
      throw new Error('ECONNRESET');
    });
    const err = await thrownBy(renderer());
    expect(err).toBeInstanceOf(RendererUnavailableError);
    expect((err as RendererUnavailableError).transient).toBe(true);
  });

  it('marks the per-minute quota transient', async () => {
    // This project is measured at about one image a minute and the model is
    // published on `global` only, so there is no region to escape to — the
    // fallback provider is the only thing that raises the ceiling.
    intercept(() => new Response('quota exceeded', { status: 429 }));
    const err = await thrownBy(renderer());
    expect((err as Error).message).toMatch(/429/);
    expect((err as RendererUnavailableError).transient).toBe(true);
  });

  it('marks an upstream outage transient', async () => {
    intercept(() => new Response('backend error', { status: 503 }));
    expect((await thrownBy(renderer()) as RendererUnavailableError).transient).toBe(true);
  });

  it('does not mark our own bad request transient', async () => {
    // A 400 or a revoked key is the same request wherever it is sent. Asking a
    // second provider bills it twice and hides the fault.
    intercept(() => new Response('project not found', { status: 403 }));
    expect((await thrownBy(renderer()) as RendererUnavailableError).transient).toBe(false);
  });

  it('reports an unreadable body', async () => {
    intercept(() => new Response('<html>504</html>', { headers: { 'content-type': 'application/json' } }));
    await expect(renderer().render(request)).rejects.toThrow(/unreadable JSON/);
  });

  it('reports a reply that is all text and no picture', async () => {
    intercept(() =>
      Response.json({ candidates: [{ content: { parts: [{ text: 'I would rather not' }] }, finishReason: 'STOP' }] }),
    );
    await expect(renderer().render(request)).rejects.toThrow(RendererUnavailableError);
  });

  it('reports an empty answer', async () => {
    intercept(() => Response.json({}));
    await expect(renderer().render(request)).rejects.toThrow(/finishReason: none/);
  });

  it('refuses a PNG rather than writing one to a .jpg', async () => {
    intercept(() =>
      Response.json({
        candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'X' } }] } }],
      }),
    );
    const err = await thrownBy(renderer());
    expect((err as Error).message).toMatch(/expected image\/jpeg/);
    // Not transient: the same model on another provider answers the same way,
    // and the failure is worth seeing rather than papering over.
    expect((err as RendererUnavailableError).transient).toBe(false);
  });
});

describe('the failures that are the photo', () => {
  it('reports a blocked prompt as a rejected photo', async () => {
    intercept(() => Response.json({ promptFeedback: { blockReason: 'SAFETY' } }));
    await expect(renderer().render(request)).rejects.toThrow(PhotoRejectedError);
  });

  it('reports a safety stop on the candidate as a rejected photo', async () => {
    intercept(() => Response.json({ candidates: [{ finishReason: 'IMAGE_SAFETY' }] }));
    await expect(renderer().render(request)).rejects.toThrow(PhotoRejectedError);
  });
});

describe('parseServiceAccountKey', () => {
  it('reads a real key file', () => {
    const parsed = parseServiceAccountKey(TEST_SA_KEY);
    expect(parsed.clientEmail).toContain('@loxa-test.iam.gserviceaccount.com');
    expect(parsed.tokenUri).toBe('https://oauth2.test/token');
  });

  it('defaults the token endpoint when the file omits it', () => {
    const key = JSON.stringify({ client_email: 'a@b.com', private_key: 'x' });
    expect(parseServiceAccountKey(key).tokenUri).toBe('https://oauth2.googleapis.com/token');
  });

  it('throws loudly on a secret that is not JSON', () => {
    // A deployment mistake, and the loudest moment to find out is composition —
    // not inside crypto.subtle after a user's credit has been spent.
    expect(() => parseServiceAccountKey('not json')).toThrow(/not valid JSON/);
  });

  it('throws on a key missing its fields', () => {
    expect(() => parseServiceAccountKey('{"type":"service_account"}')).toThrow(/client_email/);
  });
});
