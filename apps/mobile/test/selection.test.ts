import { describe, expect, it } from 'vitest';
import {
  initialSelection,
  needsCamera,
  primaryAction,
  primaryActionLabel,
  withSource,
} from '../src/selection';

/**
 * The defaults now arrive with the served catalogue, so the fixture names them
 * rather than borrowing whichever ids happen to ship — which also removes this
 * suite's silent dependency on the catalogue's contents.
 */
const BASE = initialSelection({ styleId: 'blunt-bob', colorId: 'caramel' });

describe('primaryActionLabel', () => {
  it('is Try On for a saved photo', () => {
    expect(primaryActionLabel(BASE)).toBe('Try On');
  });

  it('becomes a camera button when a new photo is wanted and none has been taken', () => {
    // The button must say what it will do. A control that silently opens the
    // camera when it is labelled Try On is how a user spends a credit by
    // accident — or fails to, and thinks the app is broken.
    const selection = withSource(BASE, 'new');
    expect(primaryActionLabel(selection)).toBe('Take photo & try on');
  });

  it('goes back to Try On once a shot exists', () => {
    const selection = { ...withSource(BASE, 'new'), hasFreshShot: true };
    expect(primaryActionLabel(selection)).toBe('Try On');
    expect(needsCamera(selection)).toBe(false);
  });
});

describe('withSource', () => {
  it('drops the fresh shot when switching back to the saved photo', () => {
    // Keeping it would make a later switch to `new` skip the camera and
    // silently reuse a photo the user has moved on from.
    const taken = { ...withSource(BASE, 'new'), hasFreshShot: true };
    expect(withSource(taken, 'saved').hasFreshShot).toBe(false);
  });

  it('keeps the fresh shot when re-selecting the new photo', () => {
    const taken = { ...withSource(BASE, 'new'), hasFreshShot: true };
    expect(withSource(taken, 'new').hasFreshShot).toBe(true);
  });

  it('leaves the style and colour alone', () => {
    const chosen = { ...BASE, styleId: 'pixie', colorId: 'copper' };
    expect(withSource(chosen, 'new')).toEqual(
      expect.objectContaining({ styleId: 'pixie', colorId: 'copper' }),
    );
  });
});

describe('primaryAction', () => {
  const withPhoto = { ...BASE, hasPhoto: true };

  it('sends someone at zero straight to the paywall', () => {
    // Not a duplicate of the Worker's check — that one is the authority and
    // still runs. This one exists so nobody watches a progress bar that was
    // never going to finish.
    expect(primaryAction(withPhoto, 0)).toBe('paywall');
  });

  it('offers the paywall before the camera', () => {
    // Sending someone to photograph themselves for a render they cannot afford
    // is worse than showing the price first.
    const needsShot = { ...withSource(BASE, 'new'), hasPhoto: false };
    expect(primaryAction(needsShot, 0)).toBe('paywall');
  });

  it('lets a request through while the balance is still loading', () => {
    // Guessing "no" would put a paywall in front of a paying subscriber on a
    // slow network. The server refuses if it must.
    expect(primaryAction(withPhoto, null)).toBe('generate');
  });

  it('opens the camera when a new photo is wanted and none taken', () => {
    expect(primaryAction(withSource(BASE, 'new'), 5)).toBe('camera');
  });

  it('asks for a photo when there is none', () => {
    expect(primaryAction(BASE, 5)).toBe('pick-photo');
  });

  it('generates when there is a photo and a credit', () => {
    expect(primaryAction(withPhoto, 1)).toBe('generate');
  });
});
