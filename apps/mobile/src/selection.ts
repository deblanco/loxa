import { DEFAULT_COLOR_ID, DEFAULT_STYLE_ID } from '@loxa/shared';

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
}

export const INITIAL_SELECTION: Selection = {
  styleId: DEFAULT_STYLE_ID,
  colorId: DEFAULT_COLOR_ID,
  source: 'saved',
  hasFreshShot: false,
};

/**
 * What the primary button says, which is also what it does.
 *
 * Asking for a new photo and not having taken one yet makes Try On a camera
 * button. Saying so on the button is the point: a control that silently does
 * something other than what it is labelled is how a user spends a credit they
 * did not mean to.
 */
export function primaryActionLabel(selection: Selection): string {
  return needsCamera(selection) ? 'Take photo & try on' : 'Try On';
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
