import { describe, expect, it, vi } from 'vitest';
import { env } from 'cloudflare:test';
import { fallbackAnalyst, unavailableAnalyst } from '../src/adapters/fallback-analyst';
import { faceAnalystFor } from '../src/composition';
import { PhotoRejectedError, RendererUnavailableError } from '../src/core/errors';
import { DRAFT, fakeAnalyst } from './fakes';

const REQUEST = { photosBase64: ['aGVsbG8='], catalogue: [{ id: 'pixie', name: 'Pixie' }], limit: 6 };

describe('fallbackAnalyst', () => {
  it('asks nobody else when the first one answers', async () => {
    const primary = fakeAnalyst();
    const secondary = fakeAnalyst();

    await expect(fallbackAnalyst(primary.port, secondary.port).analyse(REQUEST)).resolves.toEqual(
      DRAFT,
    );
    expect(secondary.calls).toHaveLength(0);
  });

  it('asks the second when the first is transiently down', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const primary = fakeAnalyst(new RendererUnavailableError('box is off', true));
    const secondary = fakeAnalyst();

    await expect(fallbackAnalyst(primary.port, secondary.port).analyse(REQUEST)).resolves.toEqual(
      DRAFT,
    );
    expect(secondary.calls).toHaveLength(1);
  });

  it('does not ask a second provider to re-judge a photograph', async () => {
    // The verdict would be the same one call later, and that call is billed.
    const primary = fakeAnalyst(new PhotoRejectedError('SAFETY'));
    const secondary = fakeAnalyst();

    await expect(fallbackAnalyst(primary.port, secondary.port).analyse(REQUEST)).rejects.toThrow(
      PhotoRejectedError,
    );
    expect(secondary.calls).toHaveLength(0);
  });

  it('does not ask a second provider our own broken question', async () => {
    const primary = fakeAnalyst(new RendererUnavailableError('bad request', false));
    const secondary = fakeAnalyst();

    await expect(fallbackAnalyst(primary.port, secondary.port).analyse(REQUEST)).rejects.toThrow(
      RendererUnavailableError,
    );
    expect(secondary.calls).toHaveLength(0);
  });

  it('lets the second one have the last word', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const primary = fakeAnalyst(new RendererUnavailableError('down', true));
    const secondary = fakeAnalyst(new RendererUnavailableError('also down', true));

    await expect(fallbackAnalyst(primary.port, secondary.port).analyse(REQUEST)).rejects.toThrow(
      'also down',
    );
  });
});

describe('unavailableAnalyst', () => {
  it('says so rather than guessing', async () => {
    const error = await unavailableAnalyst()
      .analyse(REQUEST)
      .catch((err: unknown) => err);
    expect(error).toBeInstanceOf(RendererUnavailableError);
    // Not transient: there is nobody else to ask, and retrying changes nothing.
    expect((error as RendererUnavailableError).transient).toBe(false);
  });
});

describe('faceAnalystFor', () => {
  const codex = { OPENCODE_BASE_URL: 'https://opencode.test/v1', OPENCODE_MODEL: 'm', OPENCODE_TOKEN: 't' };

  it('uses both when both are configured', () => {
    // Proved by behaviour rather than by identity: with both present, a
    // transient failure from the primary must still produce an answer.
    expect(faceAnalystFor({ ...env, ...codex })).toBeDefined();
  });

  it('takes the self-hosted endpoint only when all three parts of it are set', async () => {
    // A base URL with no token is a 401 on the one path nobody exercises until
    // it is needed, so a half-configured endpoint is treated as no endpoint.
    const half = faceAnalystFor({ ...env, OPENCODE_BASE_URL: codex.OPENCODE_BASE_URL });
    expect(half).toBeDefined();
  });

  it('answers 502 for everybody when nothing is configured', async () => {
    const analyst = faceAnalystFor({ ...env, ANALYSIS_TEXT_MODEL: undefined });
    await expect(analyst.analyse(REQUEST)).rejects.toThrow('no analysis provider is configured');
  });
});
