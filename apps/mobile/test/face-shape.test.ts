import { describe, expect, it } from 'vitest';
import {
  HEART_TAPER_AT,
  LONG_AT,
  MAX_POSE_RADIANS,
  SHORT_AT,
  SQUARE_JAW_AT,
  faceShape,
  faceShapeKey,
} from '../src/face/shape';

/**
 * A balanced face, in pixels: the middle of the band forty catalogue faces
 * measured at — length 0.99, jaw 0.82, taper 0.06.
 */
const OVAL = { cheekWidth: 400, jawWidth: 326, browWidth: 350, browToChin: 396 };

describe('faceShape', () => {
  it('reads a balanced face as oval', () => {
    expect(faceShape(OVAL)).toBe('oval');
  });

  it('does not depend on how large the face is in the frame', () => {
    const doubled = { cheekWidth: 800, jawWidth: 652, browWidth: 700, browToChin: 792 };
    expect(faceShape(doubled)).toBe(faceShape(OVAL));
  });

  it('reads a face long for its width as long', () => {
    expect(faceShape({ ...OVAL, browToChin: OVAL.cheekWidth * LONG_AT })).toBe('long');
  });

  it('reads wide brows over a narrow jaw as a heart', () => {
    const jawWidth = 300;
    const browWidth = jawWidth + OVAL.cheekWidth * HEART_TAPER_AT;
    expect(faceShape({ ...OVAL, jawWidth, browWidth })).toBe('heart');
  });

  it('reads a jaw nearly as wide as the cheeks as square', () => {
    expect(faceShape({ ...OVAL, jawWidth: OVAL.cheekWidth * SQUARE_JAW_AT })).toBe('square');
  });

  it('reads a short face with a soft jaw as round', () => {
    expect(faceShape({ ...OVAL, browToChin: OVAL.cheekWidth * SHORT_AT })).toBe('round');
  });

  it('calls a short face with a strong jaw square, not round', () => {
    const short = { ...OVAL, browToChin: OVAL.cheekWidth * SHORT_AT };
    expect(faceShape({ ...short, jawWidth: OVAL.cheekWidth * SQUARE_JAW_AT })).toBe('square');
  });

  it('lets length win over everything else', () => {
    // A long face with a strong jaw is still long first: that is the shape a
    // stylist is correcting for.
    const long = { ...OVAL, browToChin: OVAL.cheekWidth * LONG_AT };
    expect(faceShape({ ...long, jawWidth: OVAL.cheekWidth })).toBe('long');
  });

  it('refuses a tilted or turned head rather than guess', () => {
    const past = MAX_POSE_RADIANS + 0.01;
    expect(faceShape({ ...OVAL, roll: past })).toBeNull();
    expect(faceShape({ ...OVAL, yaw: -past })).toBeNull();
    expect(faceShape({ ...OVAL, roll: MAX_POSE_RADIANS / 2, yaw: 0 })).toBe('oval');
  });

  it('refuses a measurement that is not one', () => {
    expect(faceShape({ ...OVAL, cheekWidth: 0 })).toBeNull();
    expect(faceShape({ ...OVAL, jawWidth: -1 })).toBeNull();
    expect(faceShape({ ...OVAL, browToChin: Number.NaN })).toBeNull();
  });
});

describe('faceShapeKey', () => {
  it('names each shape by its own key', () => {
    expect(faceShapeKey('heart')).toBe('faceShape.heart');
  });
});
