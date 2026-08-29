/**
 * What to say when the photo has no face in it.
 *
 * The check itself is Apple's Vision framework, on the device, on the photo the
 * user just chose — see `src/photo.ts`. This file is only the sentence that
 * comes back, which is the part worth testing: it imports nothing, so the
 * Node-only suite covers it while the module that calls Vision stays on the
 * device where it belongs.
 *
 * Every line is the same shape as the hint it replaces on the viewfinder — one
 * lowercase clause, then what to do about it — because it is read in the same
 * place, in the same moment, by someone who was about to press a button.
 */

/** Why a photo was turned away. Mirrors expo-face-check's failing statuses. */
export type FaceVerdict = 'no-face' | 'multiple-faces' | 'low-quality';

const LINES: Record<FaceVerdict, string> = {
  'no-face': 'no face in that one · try again',
  'multiple-faces': 'more than one face · one at a time',
  'low-quality': 'too small or too soft · try a closer photo',
};

export function verdictLine(verdict: FaceVerdict): string {
  return LINES[verdict];
}
