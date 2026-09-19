import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COLOR_ID,
  DEFAULT_STYLE_ID,
  FACE_SHAPES,
  HAIR_COLORS,
  HAIR_STYLES,
  findColor,
  findStyle,
} from '../src/index';

describe('the catalogue', () => {
  it('has no duplicate style ids', () => {
    const ids = HAIR_STYLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no duplicate colour ids', () => {
    const ids = HAIR_COLORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every style a prompt fragment', () => {
    // An empty fragment renders whatever the model feels like and still returns
    // 200, which is the quietest possible way to ship a broken tile.
    for (const style of HAIR_STYLES) expect(style.prompt.length).toBeGreaterThan(10);
  });

  it('gives every colour a prompt fragment and a swatch', () => {
    for (const color of HAIR_COLORS) {
      expect(color.prompt.length).toBeGreaterThan(10);
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('suggests every cut for at least an oval face, and every shape at least one cut', () => {
    // Oval is the balanced shape in this vocabulary, so a cut that does not
    // list it is a typo. A shape no cut lists is a "suits you" row that is
    // always empty.
    for (const style of HAIR_STYLES) expect(style.suits).toContain('oval');
    for (const shape of FACE_SHAPES) {
      expect(HAIR_STYLES.some((style) => style.suits.includes(shape))).toBe(true);
    }
  });

  it('resolves the defaults the app opens on', () => {
    expect(findStyle(DEFAULT_STYLE_ID)).toBeDefined();
    expect(findColor(DEFAULT_COLOR_ID)).toBeDefined();
  });

  it('returns undefined for something that is not in it', () => {
    expect(findStyle('not-a-real-style')).toBeUndefined();
    expect(findColor('chartreuse')).toBeUndefined();
  });
});
