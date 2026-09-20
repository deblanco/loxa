import { afterEach, describe, expect, it, vi } from 'vitest';
import { HAIR_STYLES } from '@loxa/shared';
import { codexFaceAnalyst } from '../src/adapters/codex/analyst';
import { RendererUnavailableError } from '../src/core/errors';

const CONFIG = { baseUrl: 'https://codex.test/v1', model: 'codex-vision', token: 'secret-token' };

const REQUEST = {
  photosBase64: ['aGVsbG8='],
  catalogue: HAIR_STYLES.map((style) => ({ id: style.id, name: style.name })),
  limit: 6,
};

const ANSWER = JSON.stringify({
  faceShape: 'oval',
  cuts: [{ styleId: 'blunt-bob', reason: 'A level line answers a soft jaw.' }],
});

/** One Responses-API reply, with whatever text the test wants in it. */
function reply(text: string) {
  return {
    id: 'resp_1',
    model: CONFIG.model,
    output: [
      { type: 'message', id: 'msg_1', role: 'assistant', content: [{ type: 'output_text', text, annotations: [] }] },
    ],
    usage: { input_tokens: 1, output_tokens: 1 },
  };
}

function intercept(answer: Response | (() => Response)) {
  const calls: { url: string; headers: Headers; body: string }[] = [];
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: String(init?.body ?? ''),
    });
    return typeof answer === 'function' ? answer() : answer;
  });
  return { calls };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('codexFaceAnalyst', () => {
  it('reads an answer, and sends the photo and the token with it', async () => {
    const { calls } = intercept(Response.json(reply(ANSWER)));

    const draft = await codexFaceAnalyst(CONFIG).analyse(REQUEST);
    expect(draft).toEqual({
      faceShape: 'oval',
      cuts: [{ styleId: 'blunt-bob', reason: 'A level line answers a soft jaw.' }],
    });

    const sent = calls[0]!;
    expect(sent.url.startsWith('https://codex.test/v1')).toBe(true);
    expect(sent.headers.get('authorization')).toBe('Bearer secret-token');
    expect(sent.body).toContain('aGVsbG8=');
  });

  it('never shows a provider our prompts', async () => {
    // The catalogue crosses the wire as ids and names. What the model is asked
    // for a render stays in this Worker, and that is as true of somebody
    // else's box as it is of the app.
    const { calls } = intercept(Response.json(reply(ANSWER)));
    await codexFaceAnalyst(CONFIG).analyse(REQUEST);

    for (const style of HAIR_STYLES) {
      expect(calls[0]!.body).not.toContain(style.prompt);
    }
  });

  it('reads an answer that arrived wrapped in a markdown fence', async () => {
    // A self-hosted endpoint may ignore the format directive entirely. It has
    // still answered, and throwing that away would fail for a reason nobody
    // can see.
    intercept(Response.json(reply('```json\n' + ANSWER + '\n```')));
    await expect(codexFaceAnalyst(CONFIG).analyse(REQUEST)).resolves.toMatchObject({
      faceShape: 'oval',
    });
  });

  it('treats prose as a reason to ask somebody else', async () => {
    intercept(Response.json(reply('I am afraid I cannot help with that.')));

    const error = await codexFaceAnalyst(CONFIG).analyse(REQUEST).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(RendererUnavailableError);
    expect((error as RendererUnavailableError).transient).toBe(true);
  });

  it('treats a dead endpoint as a reason to ask somebody else', async () => {
    intercept(new Response('gateway down', { status: 502 }));

    const error = await codexFaceAnalyst(CONFIG).analyse(REQUEST).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(RendererUnavailableError);
    expect((error as RendererUnavailableError).transient).toBe(true);
  });

  it('treats a rejected token the same way', async () => {
    // Deliberately transient where the image renderer would not be: the
    // fallback is one Google call away, and a box with a stale token is
    // exactly the case it exists for.
    intercept(new Response('no', { status: 401 }));

    const error = await codexFaceAnalyst(CONFIG).analyse(REQUEST).catch((err: unknown) => err);
    expect((error as RendererUnavailableError).transient).toBe(true);
  });

  it('treats a host that cannot be reached the same way', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('network error');
    });

    const error = await codexFaceAnalyst(CONFIG).analyse(REQUEST).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(RendererUnavailableError);
    expect((error as RendererUnavailableError).transient).toBe(true);
  });
});
