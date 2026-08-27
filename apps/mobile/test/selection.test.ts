import { describe, expect, it } from 'vitest';
import {
  INITIAL_SELECTION,
  needsCamera,
  primaryActionLabel,
  withSource,
} from '../src/selection';

describe('primaryActionLabel', () => {
  it('is Try On for a saved photo', () => {
    expect(primaryActionLabel(INITIAL_SELECTION)).toBe('Try On');
  });

  it('becomes a camera button when a new photo is wanted and none has been taken', () => {
    // The button must say what it will do. A control that silently opens the
    // camera when it is labelled Try On is how a user spends a credit by
    // accident — or fails to, and thinks the app is broken.
    const selection = withSource(INITIAL_SELECTION, 'new');
    expect(primaryActionLabel(selection)).toBe('Take photo & try on');
  });

  it('goes back to Try On once a shot exists', () => {
    const selection = { ...withSource(INITIAL_SELECTION, 'new'), hasFreshShot: true };
    expect(primaryActionLabel(selection)).toBe('Try On');
    expect(needsCamera(selection)).toBe(false);
  });
});

describe('withSource', () => {
  it('drops the fresh shot when switching back to the saved photo', () => {
    // Keeping it would make a later switch to `new` skip the camera and
    // silently reuse a photo the user has moved on from.
    const taken = { ...withSource(INITIAL_SELECTION, 'new'), hasFreshShot: true };
    expect(withSource(taken, 'saved').hasFreshShot).toBe(false);
  });

  it('keeps the fresh shot when re-selecting the new photo', () => {
    const taken = { ...withSource(INITIAL_SELECTION, 'new'), hasFreshShot: true };
    expect(withSource(taken, 'new').hasFreshShot).toBe(true);
  });

  it('leaves the style and colour alone', () => {
    const chosen = { ...INITIAL_SELECTION, styleId: 'pixie', colorId: 'copper' };
    expect(withSource(chosen, 'new')).toEqual(
      expect.objectContaining({ styleId: 'pixie', colorId: 'copper' }),
    );
  });
});
