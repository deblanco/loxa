import { describe, expect, it } from 'vitest';
import type { CatalogueResponse } from '@loxa/shared';
import {
  adjacentStyle,
  clampPair,
  clampSelection,
  colorsFor,
  findStyle,
  heroKeys,
  tileFor,
} from '../src/catalogue';
import { initialSelection } from '../src/selection';

/**
 * A catalogue that is deliberately ragged, because the real one is: the
 * generator finishes a cut one colour at a time, and only three strip tiles
 * have ever been rendered.
 */
const CATALOGUE: CatalogueResponse = {
  version: 1,
  styles: [
    {
      id: 'blunt-bob',
      name: 'Blunt bob',
      tiles: ['styles/blunt-bob/tile-0.jpg', 'styles/blunt-bob/tile-1.jpg'],
      colors: [
        { id: 'caramel', heroes: ['styles/blunt-bob/caramel/0.jpg', 'styles/blunt-bob/caramel/1.jpg'] },
        { id: 'lilac', heroes: ['styles/blunt-bob/lilac/0.jpg'] },
      ],
    },
    {
      // No tile, and no caramel: the common shape mid-run.
      id: 'wolf-cut',
      name: 'Wolf cut',
      tiles: [],
      colors: [{ id: 'lilac', heroes: ['styles/wolf-cut/lilac/0.jpg'] }],
    },
  ],
  colors: [
    { id: 'caramel', name: 'Caramel', hex: '#a46c3c' },
    { id: 'lilac', name: 'Lilac', hex: '#b7a3c8' },
  ],
  defaults: { styleId: 'blunt-bob', colorId: 'caramel' },
};

describe('heroKeys', () => {
  it('returns the keys the manifest listed', () => {
    expect(heroKeys(CATALOGUE, 'blunt-bob', 'caramel')).toEqual([
      'styles/blunt-bob/caramel/0.jpg',
      'styles/blunt-bob/caramel/1.jpg',
    ]);
  });

  it('is empty for a pair with no art, rather than a key that would 404', () => {
    // The whole reason the keys are served instead of derived: the app must not
    // guess that wolf-cut/caramel exists just because both ids do.
    expect(heroKeys(CATALOGUE, 'wolf-cut', 'caramel')).toEqual([]);
    expect(heroKeys(CATALOGUE, 'no-such-style', 'caramel')).toEqual([]);
  });
});

describe('tileFor', () => {
  it('picks a tile by the session seed, and holds it', () => {
    expect(tileFor(CATALOGUE, 'blunt-bob', 0)).toBe('styles/blunt-bob/tile-0.jpg');
    expect(tileFor(CATALOGUE, 'blunt-bob', 1)).toBe('styles/blunt-bob/tile-1.jpg');
    expect(tileFor(CATALOGUE, 'blunt-bob', 2)).toBe('styles/blunt-bob/tile-0.jpg');
  });

  it('falls back to a hero when the crop was never rendered', () => {
    // 45 of the 48 tiles do not exist. A strip that waited for them would be
    // almost entirely hatch.
    expect(tileFor(CATALOGUE, 'wolf-cut', 0)).toBe('styles/wolf-cut/lilac/0.jpg');
  });

  it('is undefined for a style that is not published', () => {
    expect(tileFor(CATALOGUE, 'afro', 0)).toBeUndefined();
  });
});

describe('colorsFor', () => {
  it('gives only the colours rendered for that cut, with their swatches', () => {
    expect(colorsFor(CATALOGUE, 'wolf-cut')).toEqual([
      { id: 'lilac', name: 'Lilac', hex: '#b7a3c8' },
    ]);
  });

  it('keeps catalogue order rather than the order of the style entry', () => {
    expect(colorsFor(CATALOGUE, 'blunt-bob').map((color) => color.id)).toEqual([
      'caramel',
      'lilac',
    ]);
  });
});

describe('clampPair', () => {
  it('keeps a pair that exists', () => {
    expect(clampPair(CATALOGUE, 'blunt-bob', 'lilac')).toEqual({
      styleId: 'blunt-bob',
      colorId: 'lilac',
    });
  });

  it('holds the colour when the swipe lands on a cut that carries it', () => {
    // The confirm screen's gesture: walk the cut, keep the colour.
    expect(clampPair(CATALOGUE, 'wolf-cut', 'lilac')).toEqual({
      styleId: 'wolf-cut',
      colorId: 'lilac',
    });
  });

  it('falls back when the next cut was never rendered in this colour', () => {
    // Swiping from blunt-bob in caramel onto the wolf cut, which has only
    // lilac. The default colour is not there either, so it takes what is.
    expect(clampPair(CATALOGUE, 'wolf-cut', 'caramel')).toEqual({
      styleId: 'wolf-cut',
      colorId: 'lilac',
    });
  });

  it('falls back to the default cut when the one asked for is gone', () => {
    // A manifest refreshed underneath a screen that was naming a withdrawn cut.
    expect(clampPair(CATALOGUE, 'withdrawn', 'lilac')).toEqual({
      styleId: 'blunt-bob',
      colorId: 'lilac',
    });
  });
});

describe('clampSelection', () => {
  it('leaves a published selection exactly as it was', () => {
    // A background refresh must never yank the user's choice out from under them.
    const selection = { ...initialSelection({ styleId: 'blunt-bob', colorId: 'lilac' }), hasPhoto: true };
    expect(clampSelection(selection, CATALOGUE)).toBe(selection);
  });

  it('falls back to the default when the cut was withdrawn', () => {
    const selection = initialSelection({ styleId: 'mullet', colorId: 'lilac' });
    expect(clampSelection(selection, CATALOGUE)).toMatchObject({
      styleId: 'blunt-bob',
      colorId: 'lilac',
    });
  });

  it('moves the colour when the new cut was never rendered in it', () => {
    // Otherwise the badge names a colour over a plate with nothing behind it.
    const selection = initialSelection({ styleId: 'wolf-cut', colorId: 'caramel' });
    expect(clampSelection(selection, CATALOGUE)).toMatchObject({
      styleId: 'wolf-cut',
      colorId: 'lilac',
    });
  });

  it('keeps the rest of the selection untouched', () => {
    const selection = {
      ...initialSelection({ styleId: 'wolf-cut', colorId: 'caramel' }),
      source: 'new' as const,
      hasFreshShot: true,
      hasPhoto: true,
    };
    expect(clampSelection(selection, CATALOGUE)).toMatchObject({
      source: 'new',
      hasFreshShot: true,
      hasPhoto: true,
    });
  });

  it('is idempotent', () => {
    const once = clampSelection(initialSelection({ styleId: 'mullet', colorId: 'ash-grey' }), CATALOGUE);
    expect(clampSelection(once, CATALOGUE)).toBe(once);
  });
});

describe('findStyle', () => {
  it('is undefined for an id the manifest does not carry', () => {
    expect(findStyle(CATALOGUE, 'afro')).toBeUndefined();
  });
});

describe('adjacentStyle', () => {
  it('walks the strip in both directions', () => {
    expect(adjacentStyle(CATALOGUE, 'blunt-bob', 1)?.id).toBe('wolf-cut');
    expect(adjacentStyle(CATALOGUE, 'wolf-cut', -1)?.id).toBe('blunt-bob');
  });

  it('stops at the ends rather than wrapping', () => {
    expect(adjacentStyle(CATALOGUE, 'blunt-bob', -1)).toBeUndefined();
    expect(adjacentStyle(CATALOGUE, 'wolf-cut', 1)).toBeUndefined();
  });

  it('has no neighbour for a cut the manifest no longer lists', () => {
    expect(adjacentStyle(CATALOGUE, 'no-such-style', 1)).toBeUndefined();
  });
});
