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
  /**
   * Whether the selected source actually has a photo behind it. Nothing can be
   * rendered without one.
   *
   * Which photo that is depends on `source`: the profile portrait for `saved`,
   * this session's shot for `new`. The screen keeps the field in step with
   * both, so these rules never have to know where a picture is kept.
   */
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
): 'preview.takePhotoAndTryOn' | 'preview.takeProfilePhoto' | 'preview.tryOn' {
  if (needsCamera(selection)) return 'preview.takePhotoAndTryOn';
  if (!selection.hasPhoto) return 'preview.takeProfilePhoto';
  return 'preview.tryOn';
}

/**
 * Whether this source has to visit the camera first.
 *
 * `new` always does, and now always means it. The camera used to hand its shot
 * back to this screen, so a fresh one had to be remembered here to stop the
 * button asking for a second; it now hands off to the confirm screen instead
 * and never returns, so there is no shot for this screen to remember.
 */
export function needsCamera(selection: Selection): boolean {
  return selection.source === 'new';
}

/** Switching source. */
export function withSource(selection: Selection, source: PhotoSource): Selection {
  return { ...selection, source };
}

/** What pressing the primary button should actually do. */
export type PrimaryAction = 'paywall' | 'camera' | 'profile-photo' | 'generate';

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
  // The saved photo *is* the profile portrait, so having none is not a question
  // to answer with a library — it is a profile that has not been set up. The
  // library still exists, in the camera screen, which is where a photo that is
  // not the portrait comes from.
  //
  // `new` cannot reach here: it is answered by the camera above.
  if (!selection.hasPhoto) return 'profile-photo';
  return 'generate';
}
