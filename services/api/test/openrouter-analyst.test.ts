import { afterEach, describe, expect, it, vi } from 'vitest';
import { HAIR_STYLES } from '@loxa/shared';
import { openRouterFaceAnalyst } from '../src/adapters/openrouter/analyst';
import { PhotoRejectedError, RendererUnavailableError } from '../src/core/errors';

const CONFIG = { apiKey: 'or-key', model: 'google/gemini-2.5-flash' };

const REQUEST = {
  photosBase64: ['aGVsbG8='],
  catalogue: HAIR_STYLES.map((style) => ({ id: style.id, name: style.name })),
  limit: 6,
};

const ANSWER = JSON.stringify({
  faceShape: 'heart',
  cuts: [{ styleId: 'pixie', reason: 'Opens a narrow chin.' }],
});

const chat = (content: string) => Response.json({ choices: [{ message: { content } }] });

function intercept(answer: () => Response) {
  const calls: { url: string; body: string }[] = [];
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), body: String(init?.body ?? '') });
    return answer();
  });
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('openRouterFaceAnalyst', () => {
  it('reads an answer, from the chat endpoint rather than the images one', async () => {
    const calls = intercept(() => chat(ANSWER));

    await expect(openRouterFaceAnalyst(CONFIG).analyse(REQUEST)).resolves.toEqual({
      faceShape: 'heart',
      cuts: [{ styleId: 'pixie', reason: 'Opens a narrow chin.' }],
    });
    expect(calls[0]!.url).toBe('https://openrouter.ai/api/v1/chat/completions');
  });

  it('asks OpenRouter to route only to providers that do not collect data', async () => {
    // The only lever there is on a face once it has left our Worker.
    const calls = intercept(() => chat(ANSWER));
    await openRouterFaceAnalyst(CONFIG).analyse(REQUEST);

    expect(JSON.parse(calls[0]!.body).provider).toEqual({ data_collection: 'deny' });
  });

  it('sends every photo, and none of our prompts', async () => {
    const calls = intercept(() => chat(ANSWER));
    await openRouterFaceAnalyst(CONFIG).analyse({
      ...REQUEST,
      photosBase64: ['aGVsbG8=', 'd29ybGQ='],
    });

    const body = JSON.parse(calls[0]!.body);
    const images = body.messages[0].content.filter(
      (part: { type: string }) => part.type === 'image_url',
    );
    expect(images).toHaveLength(2);
    for (const style of HAIR_STYLES) expect(calls[0]!.body).not.toContain(style.prompt);
  });

  it('calls a refused photo the user problem it is', async () => {
    // Moderation is a verdict on the photograph; asking somebody else would
    // reach the same one.
    intercept(() => new Response('moderation', { status: 403 }));
    await expect(openRouterFaceAnalyst(CONFIG).analyse(REQUEST)).rejects.toThrow(PhotoRejectedError);
  });

  it('separates their outage from our bad request', async () => {
    intercept(() => new Response('slow down', { status: 429 }));
    const limited = await openRouterFaceAnalyst(CONFIG)
      .analyse(REQUEST)
      .catch((err: unknown) => err);
    expect((limited as RendererUnavailableError).transient).toBe(true);

    vi.unstubAllGlobals();
    intercept(() => new Response('nope', { status: 400 }));
    const ours = await openRouterFaceAnalyst(CONFIG)
      .analyse(REQUEST)
      .catch((err: unknown) => err);
    expect((ours as RendererUnavailableError).transient).toBe(false);
  });

  it('treats an error in a 200 body as an outage', async () => {
    // OpenRouter answers 200 with an error object when an upstream provider
    // fails, which would otherwise read as an empty answer.
    intercept(() => Response.json({ error: { code: 502, message: 'upstream gone' } }));
    const error = await openRouterFaceAnalyst(CONFIG)
      .analyse(REQUEST)
      .catch((err: unknown) => err);
    expect((error as RendererUnavailableError).transient).toBe(true);
  });

  it('treats prose where JSON was asked for as an outage', async () => {
    intercept(() => chat('I cannot help with that.'));
    const error = await openRouterFaceAnalyst(CONFIG)
      .analyse(REQUEST)
      .catch((err: unknown) => err);
    expect((error as RendererUnavailableError).transient).toBe(true);
  });

  it('reports a host it could not reach as worth asking elsewhere', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('network down');
    });
    const error = await openRouterFaceAnalyst(CONFIG)
      .analyse(REQUEST)
      .catch((err: unknown) => err);
    expect((error as RendererUnavailableError).transient).toBe(true);
  });
});
