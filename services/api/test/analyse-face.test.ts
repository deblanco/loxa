import { describe, expect, it } from 'vitest';
import { HAIR_STYLE_IDS } from '@loxa/shared';
import { DAILY_ANALYSIS_LIMIT, analyseFace } from '../src/core/analyse-face';
import { analysisCacheKey } from '../src/core/cache-key';
import { AnalysisQuotaError, AnalysisUnusableError, OutOfCreditsError } from '../src/core/errors';
import {
  DRAFT,
  fakeAnalysisCache,
  fakeAnalyst,
  fakeEntitlements,
  fakeLedger,
  fakeQuota,
  fixedClock,
} from './fakes';

const COMMAND = { deviceId: 'device-1', photosBase64: ['aGVsbG8='] };

/** The free credit, unspent, plus three bought ones. */
const BALANCE = 4;

/** A device with something in the pot, which is what this route asks for. */
function deps(over: Record<string, unknown> = {}) {
  const ledger = fakeLedger({ week: '2026-W35', extraCredits: 3 });
  const analyst = fakeAnalyst();
  const cache = fakeAnalysisCache();
  const quota = fakeQuota();
  return {
    ledger,
    analyst,
    cache,
    quota,
    deps: {
      ledger: ledger.port,
      entitlements: fakeEntitlements('free'),
      analyst: analyst.port,
      cache: cache.port,
      quota: quota.port,
      now: fixedClock,
      ...over,
    },
  };
}

describe('analyseFace', () => {
  it('answers, and leaves the balance exactly where it was', async () => {
    const { deps: d, ledger, analyst } = deps();
    const result = await analyseFace(COMMAND, d);

    expect(result.faceShape).toBe('oval');
    expect(result.cuts[0]?.styleId).toBe('blunt-bob');
    expect(result.creditsLeft).toBe(BALANCE);
    expect(result.cached).toBe(false);
    expect(analyst.calls).toHaveLength(1);

    // The claim this whole route rests on, made executable: it reads the
    // ledger and never writes it, which is why there is no refund path.
    expect(ledger.writes).toHaveLength(0);
  });

  it('tells the model our ids and names, and never our prompts', async () => {
    const { deps: d, analyst } = deps();
    await analyseFace(COMMAND, d);

    const sent = analyst.calls[0]!;
    expect(sent.catalogue).toHaveLength(HAIR_STYLE_IDS.length);
    expect(Object.keys(sent.catalogue[0]!)).toEqual(['id', 'name']);
  });

  it('refuses a device with nothing in the pot, before asking anybody', async () => {
    const { deps: d, analyst, ledger } = deps({
      ledger: fakeLedger({ week: '2026-W35', freeUsed: 1 }).port,
    });

    await expect(analyseFace(COMMAND, d)).rejects.toThrow(OutOfCreditsError);
    expect(analyst.calls).toHaveLength(0);
    expect(ledger.writes).toHaveLength(0);
  });

  it('serves a cached answer to a device with nothing left', async () => {
    // A hit is not a model call, so the gate has nothing to protect against —
    // and somebody who spent their last credit can still re-open their answer.
    const key = await analysisCacheKey(COMMAND.photosBase64, HAIR_STYLE_IDS);
    const cached = JSON.stringify({ faceShape: 'heart', cuts: [{ styleId: 'pixie', reason: 'Yes.' }] });
    const { deps: d, analyst } = deps({
      ledger: fakeLedger({ week: '2026-W35', freeUsed: 1 }).port,
      cache: fakeAnalysisCache({ [key]: cached }).port,
    });

    const result = await analyseFace(COMMAND, d);
    expect(result).toEqual({
      faceShape: 'heart',
      cuts: [{ styleId: 'pixie', reason: 'Yes.' }],
      creditsLeft: 0,
      cached: true,
    });
    expect(analyst.calls).toHaveLength(0);
  });

  it('treats a cached answer it can no longer read as a miss', async () => {
    const key = await analysisCacheKey(COMMAND.photosBase64, HAIR_STYLE_IDS);
    const { deps: d, analyst } = deps({ cache: fakeAnalysisCache({ [key]: 'not json' }).port });

    await expect(analyseFace(COMMAND, d)).resolves.toMatchObject({ cached: false });
    expect(analyst.calls).toHaveLength(1);
  });

  it('writes the answer into the cache under the photos that produced it', async () => {
    const { deps: d, cache } = deps();
    await analyseFace(COMMAND, d);

    const key = await analysisCacheKey(COMMAND.photosBase64, HAIR_STYLE_IDS);
    expect(JSON.parse(cache.store.get(key)!)).toEqual({
      faceShape: 'oval',
      cuts: DRAFT.cuts,
    });
  });

  it('stops a device that has asked enough for one day', async () => {
    const { deps: d, analyst } = deps({ quota: fakeQuota(true).port });

    await expect(analyseFace(COMMAND, d)).rejects.toThrow(AnalysisQuotaError);
    expect(analyst.calls).toHaveLength(0);
  });

  it('counts one analysis against the daily limit', async () => {
    const { deps: d, quota } = deps();
    await analyseFace(COMMAND, d);
    expect(quota.calls).toEqual([
      { deviceId: 'device-1', wanted: 1, limit: DAILY_ANALYSIS_LIMIT },
    ]);
  });

  it('refuses an answer naming nothing we ship, and still writes nothing', async () => {
    const { deps: d, ledger, cache } = deps({
      analyst: fakeAnalyst({ faceShape: 'oval', cuts: [{ styleId: 'beehive', reason: 'Retro.' }] })
        .port,
    });

    await expect(analyseFace(COMMAND, d)).rejects.toThrow(AnalysisUnusableError);
    expect(ledger.writes).toHaveLength(0);
    expect(cache.store.size).toBe(0);
  });

  it('lets a provider failure through without costing anybody anything', async () => {
    const { deps: d, ledger } = deps({ analyst: fakeAnalyst(new Error('down')).port });

    await expect(analyseFace(COMMAND, d)).rejects.toThrow('down');
    expect(ledger.writes).toHaveLength(0);
  });
});
