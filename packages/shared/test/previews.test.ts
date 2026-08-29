import { describe, expect, it } from 'vitest';
import {
  HAIR_COLORS,
  HAIR_STYLES,
  PREVIEW_SLOTS,
  heroKey,
  tileKey,
} from '../src/index';

describe('preview keys', () => {
  it('builds a tile key from a style and a slot', () => {
    expect(tileKey('blunt-bob', 0)).toBe('styles/blunt-bob/tile-0-r2.jpg');
    expect(tileKey('blunt-bob', 1)).toBe('styles/blunt-bob/tile-1-r2.jpg');
  });

  it('builds a hero key from a style, a colour and a slot', () => {
    expect(heroKey('wolf-cut', 'platinum', 1)).toBe('styles/wolf-cut/platinum/1-r2.jpg');
  });

  it('offers two models per style', () => {
    expect(PREVIEW_SLOTS).toEqual([0, 1]);
  });

  it('gives every key in the catalogue a distinct path', () => {
    // The generator writes to these paths and the app reads from them, so a
    // collision would silently serve one cut's photograph for another's.
    const keys = new Set<string>();
    let counted = 0;

    for (const style of HAIR_STYLES) {
      for (const slot of PREVIEW_SLOTS) {
        keys.add(tileKey(style.id, slot));
        counted++;
        for (const color of HAIR_COLORS) {
          keys.add(heroKey(style.id, color.id, slot));
          counted++;
        }
      }
    }

    expect(keys.size).toBe(counted);
  });

  it('never collides a tile with a hero', () => {
    // Only true while no colour is called "tile-0" — cheap to assert, and the
    // failure mode is a tile overwriting a full-frame preview in the bucket.
    for (const color of HAIR_COLORS) expect(color.id).not.toMatch(/^tile-/);
  });
});
