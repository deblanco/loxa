import { describe, expect, it } from 'vitest';
import { ACTIONS_HEIGHT, captionBottom } from '../src/result-layout';

describe('the result screen stack', () => {
  it('rests the caption above Share / Again, so the compare pill is never drawn under Share', () => {
    expect(captionBottom(null)).toBeGreaterThan(ACTIONS_HEIGHT);
  });

  it('pushes the caption up by the whole offer card when one is showing', () => {
    expect(captionBottom(120)).toBeGreaterThan(captionBottom(null) + 120);
  });
});
