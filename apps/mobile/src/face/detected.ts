import type { DetectedFace } from 'face-track';
import type { Bounds, LandmarkKey, Landmarks, Point } from './geometry';

/**
 * What the detector said, in the shape the projection wants.
 *
 * `modules/face-track` reports camera space — `0..1` across the frame, origin
 * top-left — because that is what `PreviewView.convertCameraPointToViewPoint`
 * consumes. This is the last step before `project`, and it is a rename and
 * nothing more: no arithmetic, so the coordinate conventions stay in exactly
 * two places, the Swift that produces them and the affine that maps them.
 *
 * A type-only import, so this stays erasable and safe to run as a worklet.
 */
const KEYS: readonly (readonly [LandmarkKey, keyof DetectedFace])[] = [
  ['LEFT_EYE', 'leftEye'],
  ['RIGHT_EYE', 'rightEye'],
  ['NOSE_BASE', 'noseBase'],
  ['MOUTH_LEFT', 'mouthLeft'],
  ['MOUTH_RIGHT', 'mouthRight'],
  ['MOUTH_BOTTOM', 'mouthBottom'],
  ['LEFT_CHEEK', 'leftCheek'],
  ['RIGHT_CHEEK', 'rightCheek'],
];

/** The face's box, in camera space. */
export function boundsOf(face: DetectedFace): Bounds {
  'worklet';
  return { x: face.x, y: face.y, width: face.width, height: face.height };
}

/**
 * The landmarks the detector actually found.
 *
 * A key Vision could not report is left out rather than guessed at. `project`
 * drops a point it was not given and every line that would have dangled from
 * it, so a partly-occluded face draws the part of the constellation that is
 * true instead of a full one that is invented.
 */
export function landmarksOf(face: DetectedFace): Landmarks {
  'worklet';
  const landmarks: Landmarks = {};
  for (const [key, field] of KEYS) {
    const point = face[field] as Point | undefined;
    if (point) landmarks[key] = { x: point.x, y: point.y };
  }
  return landmarks;
}
