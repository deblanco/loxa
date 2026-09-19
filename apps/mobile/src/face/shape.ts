import type { FaceShape } from '@loxa/shared';
import type { FaceMeasure } from 'face-track';

/**
 * A face shape, from the proportions Vision measured on the user's photo.
 *
 * A styling heuristic, not an identification: five coarse buckets from the
 * stylist's vocabulary, used to put the cuts that usually suit a shape first
 * in the strip. It is worked out on the phone, stored on the phone, and never
 * sent anywhere — not with a render, not in a diagnostic, not in a tally.
 *
 * Every ratio is against the face at its widest, so the answer does not depend
 * on how large the face is in the frame. The thresholds are a first cut, set
 * from typical adult proportions rather than calibrated against a labelled set
 * of photos; they live here, named, so that calibrating them is a change to
 * this file and its tests and nothing else.
 *
 * Vision cannot see a hairline, so length is measured from the top of the
 * eyebrows rather than from the forehead. That is shorter than the "face
 * length" a stylist would measure, and the thresholds are set for it.
 */

/** Brow-to-chin over cheek width at or above which a face reads as long. */
export const LONG_AT = 1.08;
/** At or below which it reads as short: round, or square with a strong jaw. */
export const SHORT_AT = 0.86;
/** Jaw over cheek width at or above which the jaw reads as square. */
export const SQUARE_JAW_AT = 0.9;
/** How much wider the brows are than the jaw, over cheek width, for a heart. */
export const HEART_TAPER_AT = 0.2;
/**
 * Tilt or turn beyond which the photo is not measured at all: a turned head
 * foreshortens exactly the widths the classifier reads.
 */
export const MAX_POSE_RADIANS = (12 * Math.PI) / 180;

/** The shape, or null when the photo cannot honestly say. */
export function faceShape(measure: FaceMeasure): FaceShape | null {
  const { cheekWidth, jawWidth, browWidth, browToChin, roll, yaw } = measure;

  if (![cheekWidth, jawWidth, browWidth, browToChin].every((n) => Number.isFinite(n) && n > 0)) {
    return null;
  }
  if (Math.abs(roll ?? 0) > MAX_POSE_RADIANS || Math.abs(yaw ?? 0) > MAX_POSE_RADIANS) {
    return null;
  }

  const length = browToChin / cheekWidth;
  const jaw = jawWidth / cheekWidth;
  const taper = (browWidth - jawWidth) / cheekWidth;

  if (length >= LONG_AT) return 'long';
  if (taper >= HEART_TAPER_AT) return 'heart';
  if (jaw >= SQUARE_JAW_AT) return 'square';
  if (length <= SHORT_AT) return 'round';
  return 'oval';
}

/** The i18n key naming a shape, for the screen to translate. */
export function faceShapeKey(shape: FaceShape): `faceShape.${FaceShape}` {
  return `faceShape.${shape}`;
}
