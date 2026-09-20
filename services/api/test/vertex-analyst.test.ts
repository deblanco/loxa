import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HAIR_STYLES } from '@loxa/shared';
import { parseServiceAccountKey, resetTokenCache } from '../src/adapters/vertex/auth';
import { vertexFaceAnalyst } from '../src/adapters/vertex/analyst';
import { PhotoRejectedError, RendererUnavailableError } from '../src/core/errors';
import { TEST_SA_KEY } from './service-account';

const REQUEST = {
  photosBase64: ['aGVsbG8='],
  catalogue: HAIR_STYLES.map((style) => ({ id: style.id, name: style.name })),
  limit: 6,
};

const ANSWER = JSON.stringify({
  faceShape: 'oval',
  cuts: [{ styleId: 'blunt-bob', reason: 'A level line answers a soft jaw.' }],
});

function analyst(model = 'gemini-3-flash') {
  return vertexFaceAnalyst({
    credentials: parseServiceAccountKey(TEST_SA_KEY),
    projectId: 'loxa-test',
    model,
  });
}

function intercept(vertex: () => Response) {
  const requests: { url: string; body?: string }[] = [];
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    requests.push({ url, body: init?.body as string | undefined });
    if (url.startsWith('https://oauth2.test/token')) {
      return Response.json({ access_token: 'test-token', expires_in: 3600 });
    }
    return vertex();
  });
  return requests;
}

const answered = () => Response.json({ candidates: [{ content: { parts: [{ text: ANSWER }] } }] });

beforeEach(() => {
  resetTokenCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('vertexFaceAnalyst', () => {
  it('reads an answer', async () => {
    intercept(answered);
    await expect(analyst().analyse(REQUEST)).resolves.toEqual({
      faceShape: 'oval',
      cuts: [{ styleId: 'blunt-bob', reason: 'A level line answers a soft jaw.' }],
    });
  });

  it('asks the text model, never the image one', async () => {
    // The quota guarantee, as a test rather than a comment: the image model is
    // about two requests a minute for the whole project, and that quota is
    // what renders are paid for. An analysis on it takes somebody's photo.
    const requests = intercept(answered);
    await analyst('gemini-3-flash').analyse(REQUEST);

    const call = requests.find((r) => r.url.includes('aiplatform'))!;
    expect(call.url).toContain('models/gemini-3-flash:generateContent');
    expect(call.url).not.toContain('flash-lite-image');
  });

  it('asks for JSON, and for no picture at all', async () => {
    const requests = intercept(answered);
    await analyst().analyse(REQUEST);

    const body = JSON.parse(requests.find((r) => r.url.includes('aiplatform'))!.body!);
    expect(body.generationConfig).toEqual({ responseMimeType: 'application/json' });
    expect(body.generationConfig.responseModalities).toBeUndefined();
    expect(body.generationConfig.imageConfig).toBeUndefined();
  });

  it('sends every photo it was given', async () => {
    const requests = intercept(answered);
    await analyst().analyse({ ...REQUEST, photosBase64: ['aGVsbG8=', 'd29ybGQ='] });

    const body = JSON.parse(requests.find((r) => r.url.includes('aiplatform'))!.body!);
    const inline = body.contents[0].parts.filter((p: { inlineData?: unknown }) => p.inlineData);
    expect(inline).toHaveLength(2);
  });

  it('never shows the model our render prompts', async () => {
    const requests = intercept(answered);
    await analyst().analyse(REQUEST);

    const body = requests.find((r) => r.url.includes('aiplatform'))!.body!;
    for (const style of HAIR_STYLES) expect(body).not.toContain(style.prompt);
  });

  it('calls a blocked photo the user problem it is', async () => {
    intercept(() => Response.json({ promptFeedback: { blockReason: 'SAFETY' } }));
    await expect(analyst().analyse(REQUEST)).rejects.toThrow(PhotoRejectedError);
  });

  it('calls a safety stop on the answer the same thing', async () => {
    intercept(() => Response.json({ candidates: [{ finishReason: 'SAFETY' }] }));
    await expect(analyst().analyse(REQUEST)).rejects.toThrow(PhotoRejectedError);
  });

  it('retries elsewhere on a rate limit or an outage, and nowhere on our own bad request', async () => {
    intercept(() => new Response('slow down', { status: 429 }));
    const rateLimited = await analyst().analyse(REQUEST).catch((err: unknown) => err);
    expect((rateLimited as RendererUnavailableError).transient).toBe(true);

    vi.unstubAllGlobals();
    intercept(() => new Response('bad', { status: 400 }));
    const ourFault = await analyst().analyse(REQUEST).catch((err: unknown) => err);
    expect(ourFault).toBeInstanceOf(RendererUnavailableError);
    expect((ourFault as RendererUnavailableError).transient).toBe(false);
  });

  it('treats prose as something the other provider might do better', async () => {
    intercept(() => Response.json({ candidates: [{ content: { parts: [{ text: 'Sorry!' }] } }] }));
    const error = await analyst().analyse(REQUEST).catch((err: unknown) => err);
    expect((error as RendererUnavailableError).transient).toBe(true);
  });

  it('reports a host it could not reach as worth asking elsewhere', async () => {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      if (String(input).startsWith('https://oauth2.test/token')) {
        return Response.json({ access_token: 'test-token', expires_in: 3600 });
      }
      throw new TypeError('network down');
    });

    const error = await analyst().analyse(REQUEST).catch((err: unknown) => err);
    expect((error as RendererUnavailableError).transient).toBe(true);
  });
});
