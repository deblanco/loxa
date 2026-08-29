import { describe, expect, it } from 'vitest';
import type { CatalogueResponse } from '@loxa/shared';
import {
  CATALOGUE_TTL_MS,
  parseCachedCatalogue,
  serialiseCatalogue,
} from '../src/catalogue-cache';

const CATALOGUE: CatalogueResponse = {
  version: 1,
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

const NOW = new Date('2026-08-28T12:00:00.000Z');

function aged(ms: number): string {
  return serialiseCatalogue(CATALOGUE, new Date(NOW.getTime() - ms));
}

describe('parseCachedCatalogue', () => {
  it('round-trips what was written', () => {
    const cached = parseCachedCatalogue(serialiseCatalogue(CATALOGUE, NOW), NOW);
    expect(cached?.catalogue).toEqual(CATALOGUE);
    expect(cached?.stale).toBe(false);
  });

  it('is fresh a minute short of the day', () => {
    expect(parseCachedCatalogue(aged(CATALOGUE_TTL_MS - 60_000), NOW)?.stale).toBe(false);
  });

  it('is stale a minute past it, but still returns the catalogue', () => {
    // The assertion that matters most in this file: the age decides whether to
    // *ask* for a new manifest, never whether to keep the one on disk. Throwing
    // a stale catalogue away would empty the app the moment it went offline.
    const cached = parseCachedCatalogue(aged(CATALOGUE_TTL_MS + 60_000), NOW);
    expect(cached?.stale).toBe(true);
    expect(cached?.catalogue).toEqual(CATALOGUE);
  });

  it('treats a timestamp from the future as stale rather than as fresh', () => {
    // A clock that moved, not a manifest from tomorrow. Letting it read fresh
    // would pin the app to that copy until the clock caught up.
    expect(parseCachedCatalogue(aged(-60_000), NOW)?.stale).toBe(true);
  });

  it('returns null for nothing, for garbage, and for a non-object', () => {
    expect(parseCachedCatalogue(null, NOW)).toBeNull();
    expect(parseCachedCatalogue('not json', NOW)).toBeNull();
    expect(parseCachedCatalogue('"a string"', NOW)).toBeNull();
    expect(parseCachedCatalogue('null', NOW)).toBeNull();
  });

  it('returns null when the envelope has no timestamp', () => {
    expect(parseCachedCatalogue(JSON.stringify({ catalogue: CATALOGUE }), NOW)).toBeNull();
  });

  it('refuses a manifest from a shape this build does not know', () => {
    // Discarded rather than migrated: the network has a good copy, and guessing
    // at an old one is how a bad manifest outlives itself.
    const raw = JSON.stringify({
      fetchedAt: NOW.toISOString(),
      catalogue: { ...CATALOGUE, version: 2 },
    });
    expect(parseCachedCatalogue(raw, NOW)).toBeNull();
  });

  it('refuses a manifest whose default is not in it', () => {
    // Otherwise the app boots onto a style that does not exist, and the cache
    // keeps it there for a day.
    const raw = JSON.stringify({
      fetchedAt: NOW.toISOString(),
      catalogue: { ...CATALOGUE, defaults: { styleId: 'mullet', colorId: 'caramel' } },
    });
    expect(parseCachedCatalogue(raw, NOW)).toBeNull();
  });

  it('refuses a manifest with no styles at all', () => {
    const raw = JSON.stringify({
      fetchedAt: NOW.toISOString(),
      catalogue: { ...CATALOGUE, styles: [] },
    });
    expect(parseCachedCatalogue(raw, NOW)).toBeNull();
  });

  it('refuses a style that names a colour the catalogue does not list', () => {
    const raw = JSON.stringify({
      fetchedAt: NOW.toISOString(),
      catalogue: {
        ...CATALOGUE,
        styles: [
          {
            ...CATALOGUE.styles[0]!,
            colors: [{ id: 'lilac', heroes: ['styles/blunt-bob/lilac/0.jpg'] }],
          },
        ],
      },
    });
    expect(parseCachedCatalogue(raw, NOW)).toBeNull();
  });
});
