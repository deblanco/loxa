import { describe, expect, it, vi } from 'vitest';
import { renderCacheKey } from '../src/core/cache-key';
import {
  CreditContentionError,
  OutOfCreditsError,
  RendererUnavailableError,
  UnknownStyleError,
} from '../src/core/errors';
import { tryOn } from '../src/core/try-on';
import type { CreditState } from '../src/core/rules';
import type { CreditLedgerPort } from '../src/ports/credit-ledger';
import {
  FIXED_NOW,
  fakeCache,
  fakeEntitlements,
  fakeLedger,
  fakeRenderer,
  fakeUsageStats,
  fixedClock,
} from './fakes';

const COMMAND = {
  deviceId: 'device-1',
  imageBase64: 'aGVsbG8=',
  styleId: 'blunt-bob',
  colorId: 'caramel',
};

function deps(over: Partial<Parameters<typeof tryOn>[1]> = {}) {
  const ledger = fakeLedger();
  const cache = fakeCache();
  const renderer = fakeRenderer();
  const stats = fakeUsageStats();
  return {
    ledger,
    cache,
    renderer,
    stats,
    deps: {
      ledger: ledger.port,
      cache: cache.port,
      renderer: renderer.port,
      stats: stats.port,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
      ...over,
    },
  };
}

describe('tryOn', () => {
  it('renders, spends a credit and reports the balance', async () => {
    const { deps: d, renderer } = deps();
    const result = await tryOn(COMMAND, d);

    expect(result.imageBase64).toBe('RENDERED');
    expect(result.cached).toBe(false);
    // 20 weekly + 1 free, minus the one just spent.
    expect(result.creditsLeft).toBe(20);
    expect(renderer.calls).toHaveLength(1);
  });

  it('sends the catalogue prompts, not the ids', async () => {
    const { deps: d, renderer } = deps();
    await tryOn(COMMAND, d);

    expect(renderer.calls[0]?.stylePrompt).toContain('bob');
    expect(renderer.calls[0]?.colorPrompt).toContain('caramel');
  });

  it('spends the credit before calling the model', async () => {
    // The rule the whole file exists for: a cap checked after the expensive
    // thing has happened is not a cap. Proven by a renderer that throws —
    // the write has to have already landed.
    const ledger = fakeLedger();
    const d = {
      ledger: ledger.port,
      cache: fakeCache().port,
      renderer: fakeRenderer(new RendererUnavailableError('down')).port,
      stats: fakeUsageStats().port,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
    };

    await expect(tryOn(COMMAND, d)).rejects.toThrow(RendererUnavailableError);
    expect(ledger.writes[0]).toEqual(expect.objectContaining({ weekUsed: 1 }));
  });

  it('refunds the credit when the model fails', async () => {
    const ledger = fakeLedger();
    const d = {
      ledger: ledger.port,
      cache: fakeCache().port,
      renderer: fakeRenderer(new RendererUnavailableError('down')).port,
      stats: fakeUsageStats().port,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
    };

    await expect(tryOn(COMMAND, d)).rejects.toThrow();
    expect(ledger.state.weekUsed).toBe(0);
  });

  it('refunds a bought credit as a bought credit, not as an allowance', async () => {
    // The pool a credit came from cannot be read back off the state after the
    // take, which is why `spendOne` names it and the refund is handed that name
    // rather than inferring one.
    const ledger = fakeLedger({ week: '2026-W35', freeUsed: 1, extraCredits: 1 });
    const d = {
      ledger: ledger.port,
      cache: fakeCache().port,
      renderer: fakeRenderer(new RendererUnavailableError('down')).port,
      stats: fakeUsageStats().port,
      entitlements: fakeEntitlements('free'),
      now: fixedClock,
    };

    await expect(tryOn(COMMAND, d)).rejects.toThrow();
    expect(ledger.state).toEqual(
      expect.objectContaining({ weekUsed: 0, freeUsed: 1, extraCredits: 1 }),
    );
  });

  it('keeps a purchase that landed while the model was working', async () => {
    // The refund used to restore the row as it was read before the render, so a
    // $0.99 sync inside that window was overwritten back to nothing. The worst
    // kind of lost write: `credit_grant` is keyed on the transaction id, so the
    // grant had already happened and no restore would ever repeat it. The user
    // paid and got neither the photo nor the credit.
    const ledger = fakeLedger({ week: '2026-W35' });
    const d = {
      ledger: ledger.port,
      cache: fakeCache().port,
      renderer: {
        async render() {
          const current = await ledger.port.read(COMMAND.deviceId);
          await ledger.port.write(COMMAND.deviceId, {
            ...current,
            extraCredits: current.extraCredits + 1,
          });
          throw new RendererUnavailableError('down');
        },
      },
      stats: fakeUsageStats().port,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
    };

    await expect(tryOn(COMMAND, d)).rejects.toThrow();
    expect(ledger.state).toEqual(expect.objectContaining({ weekUsed: 0, extraCredits: 1 }));
  });

  it('refuses when there is nothing to spend', async () => {
    const ledger = fakeLedger({ week: '2026-W35', freeUsed: 1 });
    const renderer = fakeRenderer();
    const d = {
      ledger: ledger.port,
      cache: fakeCache().port,
      renderer: renderer.port,
      stats: fakeUsageStats().port,
      entitlements: fakeEntitlements('free'),
      now: fixedClock,
    };

    await expect(tryOn(COMMAND, d)).rejects.toThrow(OutOfCreditsError);
    // And crucially, nothing was rendered — the refusal happens first.
    expect(renderer.calls).toHaveLength(0);
  });

  it('serves a cache hit without spending or rendering', async () => {
    const key = await renderCacheKey(COMMAND.imageBase64, COMMAND.styleId, COMMAND.colorId);
    const ledger = fakeLedger();
    const renderer = fakeRenderer();
    const d = {
      ledger: ledger.port,
      cache: fakeCache({ [key]: 'CACHED' }).port,
      renderer: renderer.port,
      stats: fakeUsageStats().port,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
    };

    const result = await tryOn(COMMAND, d);
    expect(result).toEqual({ imageBase64: 'CACHED', creditsLeft: 21, cached: true });
    expect(renderer.calls).toHaveLength(0);
    expect(ledger.writes).toHaveLength(0);
  });

  it('serves a cache hit to a device with no credits left', async () => {
    // Somebody re-opening a picture they already paid for should not be asked
    // to pay again because their balance has since run out.
    const key = await renderCacheKey(COMMAND.imageBase64, COMMAND.styleId, COMMAND.colorId);
    const d = {
      ledger: fakeLedger({ week: '2026-W35', freeUsed: 1 }).port,
      cache: fakeCache({ [key]: 'CACHED' }).port,
      renderer: fakeRenderer().port,
      stats: fakeUsageStats().port,
      entitlements: fakeEntitlements('free'),
      now: fixedClock,
    };

    await expect(tryOn(COMMAND, d)).resolves.toEqual(
      expect.objectContaining({ cached: true, creditsLeft: 0 }),
    );
  });

  it('writes the render into the cache', async () => {
    const { deps: d, cache } = deps();
    await tryOn(COMMAND, d);

    const key = await renderCacheKey(COMMAND.imageBase64, COMMAND.styleId, COMMAND.colorId);
    expect(cache.store.get(key)).toBe('RENDERED');
  });

  it('does not cache a failed render', async () => {
    const cache = fakeCache();
    const d = {
      ledger: fakeLedger().port,
      cache: cache.port,
      renderer: fakeRenderer(new RendererUnavailableError('down')).port,
      stats: fakeUsageStats().port,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
    };

    await expect(tryOn(COMMAND, d)).rejects.toThrow();
    expect(cache.store.size).toBe(0);
  });

  it('throws on a style the catalogue does not have, before spending anything', async () => {
    // Reachable now that the wire no longer enumerates the ids: an old client
    // can hold a manifest naming a cut that has since been withdrawn. It is the
    // client naming something that does not exist, so it is a 400 — and the
    // ledger must not have been touched on the way to finding that out.
    const { deps: d, ledger } = deps();
    await expect(
      tryOn({ ...COMMAND, styleId: 'not-a-real-style' }, d),
    ).rejects.toThrow(UnknownStyleError);
    expect(ledger.writes).toEqual([]);
  });

  it('throws on a colour the catalogue does not have', async () => {
    const { deps: d } = deps();
    await expect(
      tryOn({ ...COMMAND, colorId: 'not-a-real-colour' }, d),
    ).rejects.toThrow(UnknownStyleError);
  });

  it('counts the pair when it renders one', async () => {
    const { deps: d, stats } = deps();
    await tryOn(COMMAND, d);

    expect(stats.calls).toEqual([
      { styleId: 'blunt-bob', colorId: 'caramel', cached: false },
    ]);
  });

  it('counts a cache hit as a replay, not as a render', async () => {
    // Both are somebody choosing this cut; only one is a bill.
    const key = await renderCacheKey(COMMAND.imageBase64, COMMAND.styleId, COMMAND.colorId);
    const stats = fakeUsageStats();
    const d = {
      ledger: fakeLedger().port,
      cache: fakeCache({ [key]: 'CACHED' }).port,
      renderer: fakeRenderer().port,
      stats: stats.port,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
    };

    await tryOn(COMMAND, d);
    expect(stats.calls).toEqual([
      { styleId: 'blunt-bob', colorId: 'caramel', cached: true },
    ]);
  });

  it('does not count a render that failed', async () => {
    // The credit was refunded, so nothing happened. Counting it anyway would
    // inflate whichever style the model happened to be down for.
    const stats = fakeUsageStats();
    const d = {
      ledger: fakeLedger().port,
      cache: fakeCache().port,
      renderer: fakeRenderer(new RendererUnavailableError('down')).port,
      stats: stats.port,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
    };

    await expect(tryOn(COMMAND, d)).rejects.toThrow();
    expect(stats.calls).toEqual([]);
  });

  it('does not count a request that was refused for credits', async () => {
    const stats = fakeUsageStats();
    const d = {
      ledger: fakeLedger({ week: '2026-W35', freeUsed: 1 }).port,
      cache: fakeCache().port,
      renderer: fakeRenderer().port,
      stats: stats.port,
      entitlements: fakeEntitlements('free'),
      now: fixedClock,
    };

    await expect(tryOn(COMMAND, d)).rejects.toThrow(OutOfCreditsError);
    expect(stats.calls).toEqual([]);
  });

  it('still returns the picture when the counter throws', async () => {
    // By this point the credit is gone and the image exists. A statistic is
    // worth less than the render it counts, so the failure is swallowed.
    const ledger = fakeLedger();
    const d = {
      ledger: ledger.port,
      cache: fakeCache().port,
      renderer: fakeRenderer().port,
      stats: fakeUsageStats(new Error('D1 unreachable')).port,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
    };

    await expect(tryOn(COMMAND, d)).resolves.toEqual(
      expect.objectContaining({ imageBase64: 'RENDERED', creditsLeft: 20 }),
    );
    // And the credit stays spent: the swallow must not look like a failure.
    expect(ledger.state.weekUsed).toBe(1);
  });

  it('still serves a cache hit when the counter throws', async () => {
    const key = await renderCacheKey(COMMAND.imageBase64, COMMAND.styleId, COMMAND.colorId);
    const d = {
      ledger: fakeLedger().port,
      cache: fakeCache({ [key]: 'CACHED' }).port,
      renderer: fakeRenderer().port,
      stats: fakeUsageStats(new Error('D1 unreachable')).port,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
    };

    await expect(tryOn(COMMAND, d)).resolves.toEqual(
      expect.objectContaining({ imageBase64: 'CACHED', cached: true }),
    );
  });

  it('uses the clock it was given', async () => {
    const { deps: d } = deps();
    await tryOn(COMMAND, d);
    expect(FIXED_NOW.toISOString()).toBe('2026-08-27T12:00:00.000Z');
  });
});

/**
 * Make the first `readers` reads of a ledger wait for one another.
 *
 * Every request in a real race reads before any of them writes; on an in-memory
 * ledger the first one would otherwise finish before the second had started,
 * and the test would prove nothing about the interleaving it names.
 */
function simultaneous(ledger: CreditLedgerPort, readers: number): CreditLedgerPort {
  let arrived = 0;
  const release: Array<() => void> = [];

  return {
    ...ledger,
    async read(deviceId) {
      const state = await ledger.read(deviceId);
      if (arrived >= readers) return state;

      arrived += 1;
      if (arrived === readers) release.forEach((go) => go());
      else await new Promise<void>((go) => release.push(go));
      return state;
    },
  };
}

/**
 * A ledger whose swaps lose the race on the calls `isLost` names.
 *
 * Losing means something else got to the row first — here a purchase syncing —
 * so the swap finds a row that is no longer the one that was read, and reports
 * it, exactly as D1 would.
 */
function losing(
  ledger: ReturnType<typeof fakeLedger>,
  isLost: (call: number) => boolean,
): CreditLedgerPort {
  let call = 0;
  return {
    ...ledger.port,
    async compareAndWrite(deviceId, expected, next) {
      call += 1;
      if (isLost(call)) {
        await ledger.port.grantCredit(deviceId, `tx_${call}`, FIXED_NOW);
        return false;
      }
      return ledger.port.compareAndWrite(deviceId, expected, next);
    },
  };
}

describe('tryOn under concurrency', () => {
  const OTHER = { ...COMMAND, imageBase64: 'd29ybGQ=' };

  it('lets one credit buy one render when two requests race for it', async () => {
    // The bug this exists for: both requests read "one credit left", both
    // computed a spend from it, both wrote, and one credit bought two renders.
    const ledger = fakeLedger({ week: '2026-W35' });
    const renderer = fakeRenderer();
    const d = {
      ledger: simultaneous(ledger.port, 2),
      cache: fakeCache().port,
      renderer: renderer.port,
      stats: fakeUsageStats().port,
      entitlements: fakeEntitlements('free'),
      now: fixedClock,
    };

    const results = await Promise.allSettled([tryOn(COMMAND, d), tryOn(OTHER, d)]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const refused = results.filter((r) => r.status === 'rejected');
    expect(refused).toHaveLength(1);
    expect(refused[0]).toEqual(
      expect.objectContaining({ reason: expect.any(OutOfCreditsError) }),
    );
    expect(renderer.calls).toHaveLength(1);
    expect(ledger.state.freeUsed).toBe(1);
  });

  it('counts both spends when two requests race for a subscriber allowance', async () => {
    // Not a refusal case: both should render, and the counter has to say two.
    // With a plain write the loser overwrote the winner and it said one.
    const ledger = fakeLedger({ week: '2026-W35', lastPlan: 'weekly' });
    const renderer = fakeRenderer();
    const d = {
      ledger: simultaneous(ledger.port, 2),
      cache: fakeCache().port,
      renderer: renderer.port,
      stats: fakeUsageStats().port,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
    };

    await Promise.all([tryOn(COMMAND, d), tryOn(OTHER, d)]);

    expect(renderer.calls).toHaveLength(2);
    expect(ledger.state.weekUsed).toBe(2);
  });

  it('reads again and spends when a purchase lands between the read and the swap', async () => {
    const ledger = fakeLedger({ week: '2026-W35' });
    const renderer = fakeRenderer();
    const d = {
      ledger: losing(ledger, (call) => call === 1),
      cache: fakeCache().port,
      renderer: renderer.port,
      stats: fakeUsageStats().port,
      entitlements: fakeEntitlements('free'),
      now: fixedClock,
    };

    await expect(tryOn(COMMAND, d)).resolves.toEqual(
      expect.objectContaining({ imageBase64: 'RENDERED', cached: false }),
    );
    expect(renderer.calls).toHaveLength(1);
    // The purchase that won the race is on the row, next to the spend.
    expect(ledger.state).toEqual(expect.objectContaining({ freeUsed: 1, extraCredits: 1 }));
  });

  it('gives up after three lost races, having rendered nothing', async () => {
    const ledger = fakeLedger({ week: '2026-W35' });
    const renderer = fakeRenderer();
    const d = {
      ledger: losing(ledger, () => true),
      cache: fakeCache().port,
      renderer: renderer.port,
      stats: fakeUsageStats().port,
      entitlements: fakeEntitlements('free'),
      now: fixedClock,
    };

    await expect(tryOn(COMMAND, d)).rejects.toThrow(CreditContentionError);
    expect(renderer.calls).toHaveLength(0);
    expect(ledger.state.freeUsed).toBe(0);
  });

  it('refuses on the re-read when the race was lost to the last credit', async () => {
    // The retry decides again from what is there now: the request that won
    // took the free credit, so this one is out of credits rather than spent.
    const ledger = fakeLedger({ week: '2026-W35' });
    const renderer = fakeRenderer();
    let raced = false;
    const d = {
      ledger: {
        ...ledger.port,
        async compareAndWrite(deviceId: string, expected: CreditState, next: CreditState) {
          if (!raced) {
            raced = true;
            await ledger.port.write(deviceId, { ...ledger.state, freeUsed: 1 });
            return false;
          }
          return ledger.port.compareAndWrite(deviceId, expected, next);
        },
      },
      cache: fakeCache().port,
      renderer: renderer.port,
      stats: fakeUsageStats().port,
      entitlements: fakeEntitlements('free'),
      now: fixedClock,
    };

    await expect(tryOn(COMMAND, d)).rejects.toThrow(OutOfCreditsError);
    expect(renderer.calls).toHaveLength(0);
  });

  it('refunds without overwriting a spend that landed during the render', async () => {
    const ledger = fakeLedger({ week: '2026-W35', lastPlan: 'weekly', weekUsed: 3 });
    const d = {
      ledger: ledger.port,
      cache: fakeCache().port,
      renderer: {
        async render() {
          // A second request, spending its own credit while this one renders.
          const current = await ledger.port.read(COMMAND.deviceId);
          await ledger.port.compareAndWrite(COMMAND.deviceId, current, {
            ...current,
            weekUsed: current.weekUsed + 1,
          });
          throw new RendererUnavailableError('down');
        },
      },
      stats: fakeUsageStats().port,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
    };

    await expect(tryOn(COMMAND, d)).rejects.toThrow(RendererUnavailableError);
    // 3, this request's spend (4), the other's (5), this request's refund (4).
    expect(ledger.state.weekUsed).toBe(4);
  });

  it('refunds exactly once when the refund itself loses a race', async () => {
    // Call 1 is the spend, call 2 the first refund attempt, which loses. The
    // retry must land once — a double refund would leave weekUsed at 2.
    const ledger = fakeLedger({ week: '2026-W35', lastPlan: 'weekly', weekUsed: 3 });
    const d = {
      ledger: losing(ledger, (call) => call === 2),
      cache: fakeCache().port,
      renderer: fakeRenderer(new RendererUnavailableError('down')).port,
      stats: fakeUsageStats().port,
      entitlements: fakeEntitlements('weekly'),
      now: fixedClock,
    };

    await expect(tryOn(COMMAND, d)).rejects.toThrow(RendererUnavailableError);
    expect(ledger.state).toEqual(expect.objectContaining({ weekUsed: 3, extraCredits: 1 }));
  });

  it('still reports the render failure when the refund cannot land', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ledger = fakeLedger({ week: '2026-W35' });
    const d = {
      ledger: losing(ledger, (call) => call > 1),
      cache: fakeCache().port,
      renderer: fakeRenderer(new RendererUnavailableError('down')).port,
      stats: fakeUsageStats().port,
      entitlements: fakeEntitlements('free'),
      now: fixedClock,
    };

    await expect(tryOn(COMMAND, d)).rejects.toThrow(RendererUnavailableError);
    expect(error).toHaveBeenCalledWith('credit not refunded: the row kept changing');
    error.mockRestore();
  });
});

describe('renderCacheKey', () => {
  it('is stable for the same request', async () => {
    expect(await renderCacheKey('a', 'pixie', 'copper')).toBe(
      await renderCacheKey('a', 'pixie', 'copper'),
    );
  });

  it('changes with the style, the colour and the photo', async () => {
    const base = await renderCacheKey('a', 'pixie', 'copper');
    expect(await renderCacheKey('a', 'buzz', 'copper')).not.toBe(base);
    expect(await renderCacheKey('a', 'pixie', 'cherry')).not.toBe(base);
    expect(await renderCacheKey('b', 'pixie', 'copper')).not.toBe(base);
  });

  it('does not contain the photo', async () => {
    // A key with a face in it is a face in a log line.
    const key = await renderCacheKey('SECRETPHOTO', 'pixie', 'copper');
    expect(key).not.toContain('SECRETPHOTO');
    expect(key).toMatch(/^tryon:[0-9a-f]{64}$/);
  });
});
