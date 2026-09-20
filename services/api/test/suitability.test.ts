import { describe, expect, it } from 'vitest';
import { MAX_REASON } from '@loxa/shared';
import { AnalysisUnusableError } from '../src/core/errors';
import { MAX_CUTS, validateSuitability } from '../src/core/suitability';

const ALLOWED = new Set(['blunt-bob', 'pixie', 'wolf-cut', 'lob', 'afro', 'locs', 'mullet']);

function draft(cuts: { styleId: string; reason: string }[], faceShape = 'oval') {
  return { faceShape, cuts };
}

describe('validateSuitability', () => {
  it('keeps a cut we ship, with its reason', () => {
    const result = validateSuitability(draft([{ styleId: 'pixie', reason: 'Balances a round jaw.' }]), ALLOWED);
    expect(result).toEqual({
      faceShape: 'oval',
      cuts: [{ styleId: 'pixie', reason: 'Balances a round jaw.' }],
    });
  });

  it('drops a cut the model invented rather than showing it', () => {
    // Models name plausible haircuts we do not have. A shorter list is better
    // than a row the app cannot render.
    const result = validateSuitability(
      draft([
        { styleId: 'shaggy-mullet-fade', reason: 'Very now.' },
        { styleId: 'pixie', reason: 'Balances a round jaw.' },
      ]),
      ALLOWED,
    );
    expect(result.cuts.map((c) => c.styleId)).toEqual(['pixie']);
  });

  it('reads an id whatever case and spacing it arrives in', () => {
    const result = validateSuitability(draft([{ styleId: '  Wolf-Cut ', reason: 'Texture.' }]), ALLOWED);
    expect(result.cuts[0]?.styleId).toBe('wolf-cut');
  });

  it('collapses duplicates, keeping the rank the model chose', () => {
    const result = validateSuitability(
      draft([
        { styleId: 'lob', reason: 'First.' },
        { styleId: 'pixie', reason: 'Second.' },
        { styleId: 'lob', reason: 'Again.' },
      ]),
      ALLOWED,
    );
    expect(result.cuts.map((c) => c.styleId)).toEqual(['lob', 'pixie']);
    expect(result.cuts[0]?.reason).toBe('First.');
  });

  it('cleans prose rather than refusing it', () => {
    const result = validateSuitability(
      draft([{ styleId: 'pixie', reason: '  Soft\n\tlayers   round   the jaw. ' }]),
      ALLOWED,
    );
    expect(result.cuts[0]?.reason).toBe('Soft layers round the jaw.');
  });

  it('caps a reason at what the screen has room for', () => {
    const result = validateSuitability(
      draft([{ styleId: 'pixie', reason: 'x'.repeat(MAX_REASON + 50) }]),
      ALLOWED,
    );
    expect(result.cuts[0]?.reason).toHaveLength(MAX_REASON);
  });

  it('drops a cut whose reason is only whitespace', () => {
    expect(() =>
      validateSuitability(draft([{ styleId: 'pixie', reason: '   \n ' }]), ALLOWED),
    ).toThrow(AnalysisUnusableError);
  });

  it('returns no more cuts than the screen shows', () => {
    const many = [...ALLOWED].map((styleId) => ({ styleId, reason: 'Because.' }));
    expect(many.length).toBeGreaterThan(MAX_CUTS);
    expect(validateSuitability(draft(many), ALLOWED).cuts).toHaveLength(MAX_CUTS);
  });

  it('throws the whole answer away on a face shape that is not one of ours', () => {
    // Not dropped, and not defaulted to oval: this answer replaces the shape
    // the phone measured, so a guess here silently overwrites real data.
    expect(() =>
      validateSuitability(draft([{ styleId: 'pixie', reason: 'Fine.' }], 'triangle'), ALLOWED),
    ).toThrow(AnalysisUnusableError);
  });

  it('throws when nothing in the answer is a cut we ship', () => {
    expect(() =>
      validateSuitability(draft([{ styleId: 'beehive', reason: 'Retro.' }]), ALLOWED),
    ).toThrow(AnalysisUnusableError);
  });
});
