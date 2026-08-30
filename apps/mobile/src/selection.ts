/**
 * What the preview screen is currently showing, as plain data.
 *
 * Pulled out of the screen so the parts worth testing — what the Try On button
 * says, whether a source needs the camera first — are testable without
 * rendering anything. The screen owns the React state; this owns the rules.
 */

/** Where the photo being restyled comes from. */
export type PhotoSource = 'saved' | 'new';

export interface Selection {
  styleId: string;
  colorId: string;
  source: PhotoSource;
  /** True once a photo has been taken this session for the `new` source. */
  hasFreshShot: boolean;
  /** Whether a photo has been chosen at all. Nothing can be rendered without one. */
  hasPhoto: boolean;
}

/**
 * A fresh selection, opened on whatever the catalogue says to open on.
 *
 * The defaults used to be constants compiled into the app. They now arrive with
 * the manifest, because the catalogue is served and the style it opens on has
 * to be one that is actually published — a default that was withdrawn is a
 * screen naming a cut it cannot draw.
 */
export function initialSelection(defaults: { styleId: string; colorId: string }): Selection {
  return {
    styleId: defaults.styleId,
    colorId: defaults.colorId,
    source: 'saved',
    hasFreshShot: false,
    hasPhoto: false,
  };
}

/**
 * What the primary button says, which is also what it does.
 *
 * Asking for a new photo and not having taken one yet makes Try On a camera
 * button. Saying so on the button is the point: a control that silently does
 * something other than what it is labelled is how a user spends a credit they
 * did not mean to.
 */
export function primaryActionLabel(
  selection: Selection,
): 'preview.takePhotoAndTryOn' | 'preview.tryOn' {
  return needsCamera(selection) ? 'preview.takePhotoAndTryOn' : 'preview.tryOn';
}

export function needsCamera(selection: Selection): boolean {
  return selection.source === 'new' && !selection.hasFreshShot;
}

/**
 * Switching source.
 *
 * Going back to the saved photo drops the fresh shot: leaving it set would make
 * a later switch to `new` skip the camera and silently reuse an old picture.
 */
export function withSource(selection: Selection, source: PhotoSource): Selection {
  return {
    ...selection,
    source,
    hasFreshShot: source === 'new' ? selection.hasFreshShot : false,
  };
}

/** What pressing the primary button should actually do. */
export type PrimaryAction = 'paywall' | 'camera' | 'pick-photo' | 'generate';

/**
 * Where the Try On button goes.
 *
 * The credit check comes first, and it is not a duplicate of the Worker's — the
 * Worker's is the authority and always runs, spending before the model call.
 * This one exists so that somebody at zero does not watch a progress bar that
 * was never going to finish, and does not get sent to the camera to take a
 * photo they cannot use.
 *
 * `creditsLeft` is null while the balance is still loading. That case goes
 * through: the server will refuse if it must, and guessing "no" would put a
 * paywall in front of a paying subscriber on a slow network.
 */
export function primaryAction(selection: Selection, creditsLeft: number | null): PrimaryAction {
  if (creditsLeft !== null && creditsLeft < 1) return 'paywall';
  if (needsCamera(selection)) return 'camera';
  if (!selection.hasPhoto) return 'pick-photo';
  return 'generate';
}
