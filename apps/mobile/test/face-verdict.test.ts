import { describe, expect, it } from 'vitest';
import { verdictLine, type FaceVerdict } from '../src/face/verdict';
import en from '../src/i18n/locales/en';

const VERDICTS: FaceVerdict[] = ['no-face', 'multiple-faces', 'low-quality'];

/**
 * The lines themselves live in the locales now, and their shape — one lowercase
 * clause, then what to do about it — is asserted there, in all five languages.
 * What is left here is the mapping: that every reason a photo can be turned
 * away reaches a key, and that no two reasons reach the same one.
 */
describe('verdictLine', () => {
  it('has a key for every reason a photo can be turned away', () => {
    for (const verdict of VERDICTS) {
      expect(verdictLine(verdict)).toBeTruthy();
    }
  });

  it('says something different for each one', () => {
    const keys = new Set(VERDICTS.map(verdictLine));
    expect(keys.size).toBe(VERDICTS.length);
  });

  it('names a key the copy actually has', () => {
    // A key with no string behind it renders as itself, which on the viewfinder
    // would read as `verdict.no-face` under somebody's chin.
    for (const verdict of VERDICTS) {
      expect(en.verdict[verdict]).toBeTruthy();
    }
  });
});
