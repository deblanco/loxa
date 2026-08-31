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
    expect(primaryActionLabel({ ...BASE, hasPhoto: true })).toBe('preview.tryOn');
  });

  it('asks for the portrait when the saved source has none', () => {
    // The saved photo is the profile portrait, so having none is a profile that
    // has not been set up rather than a library that has not been opened.
    expect(primaryActionLabel(BASE)).toBe('preview.takeProfilePhoto');
  });

  it('becomes a camera button whenever a new photo is wanted', () => {
    // The button must say what it will do. A control that silently opens the
    // camera when it is labelled Try On is how a user spends a credit by
    // accident — or fails to, and thinks the app is broken.
    const selection = withSource(BASE, 'new');
    expect(primaryActionLabel(selection)).toBe('preview.takePhotoAndTryOn');
    expect(needsCamera(selection)).toBe(true);
  });

  it('still asks for the camera once a shot has been taken elsewhere', () => {
    // A shot taken on the camera is confirmed on the screen after it and never
    // comes back here, so this screen has none to remember. `new` means the
    // camera every time it is chosen.
    const selection = { ...withSource(BASE, 'new'), hasPhoto: true };
    expect(primaryActionLabel(selection)).toBe('preview.takePhotoAndTryOn');
  });
});

describe('withSource', () => {
  it('leaves the style and colour alone', () => {
    const chosen = { ...BASE, styleId: 'pixie', colorId: 'copper' };
    expect(withSource(chosen, 'new')).toEqual(
      expect.objectContaining({ styleId: 'pixie', colorId: 'copper' }),
    );
  });
});

describe('primaryAction', () => {
  const withPhoto = { ...BASE, hasPhoto: true };

  it('never sends anyone to the paywall', () => {
    // The confirm screen asks for money, because it is the screen that spends
    // it. Somebody at zero still gets there and sees the cut on a face first —
    // a paywall in front of an unseen screen sells nothing.
    expect(primaryAction(withPhoto)).toBe('generate');
    expect(primaryAction(BASE)).toBe('profile-photo');
    expect(primaryAction(withSource(BASE, 'new'))).toBe('camera');
  });

  it('opens the camera whenever a new photo is wanted', () => {
    expect(primaryAction(withSource(BASE, 'new'))).toBe('camera');
    // Even with a photo behind the selection: `new` is answered by the camera
    // before `hasPhoto` is ever consulted.
    expect(primaryAction({ ...withSource(BASE, 'new'), hasPhoto: true })).toBe('camera');
  });

  it('sends someone with no portrait to take one', () => {
    expect(primaryAction(BASE)).toBe('profile-photo');
  });

  it('generates when there is a photo', () => {
    expect(primaryAction(withPhoto)).toBe('generate');
  });
});
