import { afterEach, describe, expect, it, vi } from 'vitest';
import { HAIR_STYLES } from '@loxa/shared';
import { opencodeFaceAnalyst } from '../src/adapters/opencode/analyst';
import { RendererUnavailableError } from '../src/core/errors';

const CONFIG = { baseUrl: 'https://opencode.test/v1', model: 'codex-vision', token: 'secret-token' };

const REQUEST = {
  photosBase64: ['aGVsbG8='],
  catalogue: HAIR_STYLES.map((style) => ({ id: style.id, name: style.name })),
  limit: 6,
};

const ANSWER = JSON.stringify({
  faceShape: 'oval',
  cuts: [{ styleId: 'blunt-bob', reason: 'A level line answers a soft jaw.' }],
});

/** One chat-completions reply, with whatever text the test wants in it. */
function reply(text: string) {
  return {
    id: 'chat_1',
    object: 'chat.completion',
    created: 1,
    model: CONFIG.model,
    choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: text } }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
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

describe('opencodeFaceAnalyst', () => {
  it('reads an answer, and sends the photo and the token with it', async () => {
    const { calls } = intercept(Response.json(reply(ANSWER)));

    const draft = await opencodeFaceAnalyst(CONFIG).analyse(REQUEST);
    expect(draft).toEqual({
      faceShape: 'oval',
      cuts: [{ styleId: 'blunt-bob', reason: 'A level line answers a soft jaw.' }],
    });

    const sent = calls[0]!;
    expect(sent.url.startsWith('https://opencode.test/v1')).toBe(true);
    expect(sent.headers.get('authorization')).toBe('Bearer secret-token');
    // The endpoint refuses a request with no session id.
    expect(sent.headers.get('x-opencode-session')).toBeTruthy();
    expect(sent.body).toContain('aGVsbG8=');
  });

  it('gives each call its own session, so nobody can link one user to themselves', async () => {
    // A factory, not one Response: a body can only be read once.
    const { calls } = intercept(() => Response.json(reply(ANSWER)));
    const analyst = opencodeFaceAnalyst(CONFIG);
    await analyst.analyse(REQUEST);
    await analyst.analyse(REQUEST);

    expect(calls[0]!.headers.get('x-opencode-session')).not.toBe(
      calls[1]!.headers.get('x-opencode-session'),
    );
  });

  it('never shows a provider our prompts', async () => {
    // The catalogue crosses the wire as ids and names. What the model is asked
    // for a render stays in this Worker, and that is as true of somebody
    // else's box as it is of the app.
    const { calls } = intercept(Response.json(reply(ANSWER)));
    await opencodeFaceAnalyst(CONFIG).analyse(REQUEST);

    for (const style of HAIR_STYLES) {
      expect(calls[0]!.body).not.toContain(style.prompt);
    }
  });

  it('reads an answer that arrived wrapped in a markdown fence', async () => {
    // A self-hosted endpoint may ignore the format directive entirely. It has
    // still answered, and throwing that away would fail for a reason nobody
    // can see.
    intercept(Response.json(reply('```json\n' + ANSWER + '\n```')));
    await expect(opencodeFaceAnalyst(CONFIG).analyse(REQUEST)).resolves.toMatchObject({
      faceShape: 'oval',
    });
  });

  it('treats prose as a reason to ask somebody else', async () => {
    intercept(Response.json(reply('I am afraid I cannot help with that.')));

    const error = await opencodeFaceAnalyst(CONFIG).analyse(REQUEST).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(RendererUnavailableError);
    expect((error as RendererUnavailableError).transient).toBe(true);
  });

  it('treats a dead endpoint as a reason to ask somebody else', async () => {
    intercept(new Response('gateway down', { status: 502 }));

    const error = await opencodeFaceAnalyst(CONFIG).analyse(REQUEST).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(RendererUnavailableError);
    expect((error as RendererUnavailableError).transient).toBe(true);
  });

  it('treats a rejected token the same way', async () => {
    // Deliberately transient where the image renderer would not be: the
    // fallback is one Google call away, and a box with a stale token is
    // exactly the case it exists for.
    intercept(new Response('no', { status: 401 }));

    const error = await opencodeFaceAnalyst(CONFIG).analyse(REQUEST).catch((err: unknown) => err);
    expect((error as RendererUnavailableError).transient).toBe(true);
  });

  it('treats a host that cannot be reached the same way', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('network error');
    });

    const error = await opencodeFaceAnalyst(CONFIG).analyse(REQUEST).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(RendererUnavailableError);
    expect((error as RendererUnavailableError).transient).toBe(true);
  });
});

describe('the deadline on the primary', () => {
  it('gives up on a provider that never answers, and says another may try', async () => {
    // The fallback is no use if nothing ever gives up on the primary. Before
    // this, a provider that took thirty-five seconds was simply waited for,
    // with somebody watching a progress bar the whole time.
    vi.stubGlobal('fetch', (_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) throw new Error('the request carried no abort signal');
        signal.addEventListener('abort', () => reject(signal.reason as Error));
      });
    });

    const failure = await opencodeFaceAnalyst({ ...CONFIG, deadlineMs: 50 })
      .analyse(REQUEST)
      .catch((err: unknown) => err);

    expect(failure).toBeInstanceOf(RendererUnavailableError);
    // Transient, so `fallbackAnalyst` asks the other provider rather than
    // handing the user an error.
    expect((failure as RendererUnavailableError).transient).toBe(true);
  });

  it('does not abort a provider that answers in time', async () => {
    const intercepted = intercept(() => Response.json(reply(ANSWER)));

    await expect(opencodeFaceAnalyst(CONFIG).analyse(REQUEST)).resolves.toMatchObject({
      faceShape: 'oval',
    });
    expect(intercepted.calls).toHaveLength(1);
  });
});
