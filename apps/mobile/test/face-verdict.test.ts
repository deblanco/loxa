import { describe, expect, it } from 'vitest';
import { verdictLine, type FaceVerdict } from '../src/face/verdict';

const VERDICTS: FaceVerdict[] = ['no-face', 'multiple-faces', 'low-quality'];

describe('verdictLine', () => {
  it('has a line for every reason a photo can be turned away', () => {
    for (const verdict of VERDICTS) {
      expect(verdictLine(verdict)).toBeTruthy();
    }
  });

  it('says something different for each one', () => {
    const lines = new Set(VERDICTS.map(verdictLine));
    expect(lines.size).toBe(VERDICTS.length);
  });

  it('keeps the shape of the hint it replaces: lowercase, and a way out', () => {
    for (const verdict of VERDICTS) {
      const line = verdictLine(verdict);
      expect(line).toBe(line.toLowerCase());
      expect(line).toContain(' · ');
    }
  });
});
