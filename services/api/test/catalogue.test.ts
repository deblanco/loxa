import { env } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readCatalogue, shippedCatalogue } from '../src/adapters/r2/catalogue';

/**
 * Reading the manifest, and every way it can be absent.
 *
 * The route's job is to always answer. This is where "always" is decided, so
 * each failure gets its own case: no object, not JSON, JSON that is not a
 * manifest, and a bucket that will not answer at all.
 */
const MANIFEST = {
  version: 1 as const,
  styles: [
    {
      id: 'blunt-bob',
      name: 'Blunt bob',
      tiles: [],
      colors: [{ id: 'caramel', heroes: ['styles/blunt-bob/caramel/0.jpg'] }],
    },
  ],
  colors: [{ id: 'caramel', name: 'Caramel', hex: '#a46c3c' }],
  defaults: { styleId: 'blunt-bob', colorId: 'caramel' },
};

afterEach(async () => {
  await env.ASSETS.delete('catalogue.json');
  vi.restoreAllMocks();
});

describe('shippedCatalogue', () => {
  it('is the whole compiled catalogue, and passes its own schema', () => {
    const catalogue = shippedCatalogue();
    expect(catalogue.styles).toHaveLength(24);
    expect(catalogue.colors).toHaveLength(10);
    // Optimistic on purpose: these keys may 404, and the app draws the hatch
    // when they do — a state it is already built for.
    expect(catalogue.styles[0]!.tiles).toHaveLength(2);
  });

  it('opens on a style it actually contains', () => {
    const catalogue = shippedCatalogue();
    expect(catalogue.styles.some((s) => s.id === catalogue.defaults.styleId)).toBe(true);
  });
});

describe('readCatalogue', () => {
  it('returns the manifest and its etag', async () => {
    await env.ASSETS.put('catalogue.json', JSON.stringify(MANIFEST));

    const { catalogue, etag } = await readCatalogue(env.ASSETS);
    expect(catalogue).toEqual(MANIFEST);
    expect(etag).toBeTruthy();
  });

  it('falls back with no etag when there is no object', async () => {
    const { catalogue, etag } = await readCatalogue(env.ASSETS);
    expect(catalogue.styles).toHaveLength(24);
    expect(etag).toBeUndefined();
  });

  it('falls back when the object is not JSON', async () => {
    await env.ASSETS.put('catalogue.json', 'not json at all');
    const { catalogue } = await readCatalogue(env.ASSETS);
    expect(catalogue.styles).toHaveLength(24);
  });

  it('falls back when the manifest fails its own schema', async () => {
    await env.ASSETS.put(
      'catalogue.json',
      JSON.stringify({ ...MANIFEST, defaults: { styleId: 'mullet', colorId: 'caramel' } }),
    );
    const { catalogue } = await readCatalogue(env.ASSETS);
    expect(catalogue.styles).toHaveLength(24);
  });

  it('falls back when the bucket will not answer', async () => {
    const bucket = { get: () => Promise.reject(new Error('down')) } as unknown as R2Bucket;
    const { catalogue } = await readCatalogue(bucket);
    expect(catalogue.styles).toHaveLength(24);
  });
});
