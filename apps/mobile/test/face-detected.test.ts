import { describe, expect, it } from 'vitest';
import type { DetectedFace } from 'face-track';
import { boundsOf, landmarksOf } from '../src/face/detected';
import { coverCorners, displacement } from '../src/face/geometry';

const FACE: DetectedFace = {
  x: 0.25,
  y: 0.1,
  width: 0.5,
  height: 0.6,
  leftEye: { x: 0.6, y: 0.3 },
  rightEye: { x: 0.4, y: 0.3 },
  noseBase: { x: 0.5, y: 0.45 },
};

describe('landmarksOf', () => {
  it('renames what the detector found', () => {
    expect(landmarksOf(FACE)).toEqual({
      LEFT_EYE: { x: 0.6, y: 0.3 },
      RIGHT_EYE: { x: 0.4, y: 0.3 },
      NOSE_BASE: { x: 0.5, y: 0.45 },
    });
  });

  it('leaves out what it did not', () => {
    // Vision reports no region for an occluded feature, and `project` drops the
    // point along with any line that would have dangled off it. A guessed mouth
    // on a half-hidden face is worse than no mouth.
    const landmarks = landmarksOf(FACE);
    expect(landmarks.MOUTH_LEFT).toBeUndefined();
    expect(landmarks.LEFT_CHEEK).toBeUndefined();
  });

  it('is empty for a face with no landmarks at all', () => {
    expect(landmarksOf({ x: 0, y: 0, width: 1, height: 1 })).toEqual({});
  });
});

describe('boundsOf', () => {
  it('is the detector box', () => {
    expect(boundsOf(FACE)).toEqual({ x: 0.25, y: 0.1, width: 0.5, height: 0.6 });
  });
});

describe('coverCorners', () => {
  it('fills the view exactly when the aspect ratios match', () => {
    expect(coverCorners({ width: 100, height: 200 }, { width: 200, height: 400 }, false)).toEqual({
      topLeft: { x: 0, y: 0 },
      bottomRight: { x: 200, y: 400 },
    });
  });

  it('crops the overflow evenly on the wider axis', () => {
    // A 2:1 frame in a 1:1 view scales to the height and hangs off both sides.
    const { topLeft, bottomRight } = coverCorners(
      { width: 200, height: 100 },
      { width: 100, height: 100 },
      false,
    );
    expect(topLeft).toEqual({ x: -50, y: 0 });
    expect(bottomRight).toEqual({ x: 150, y: 100 });
  });

  it('swaps the x corners when the preview is mirrored', () => {
    // `mirrored` is what the *preview* is doing, not the frame. The frame
    // output is not mirrored and the front camera's preview is, so without the
    // swap the landmarks track the wrong way: turn your head left and the
    // constellation goes right.
    const plain = coverCorners({ width: 100, height: 100 }, { width: 100, height: 100 }, false);
    const mirrored = coverCorners({ width: 100, height: 100 }, { width: 100, height: 100 }, true);

    expect(mirrored.topLeft.x).toBe(plain.bottomRight.x);
    expect(mirrored.bottomRight.x).toBe(plain.topLeft.x);
    // Only x mirrors. A vertically flipped constellation would be upside down.
    expect(mirrored.topLeft.y).toBe(plain.topLeft.y);
    expect(mirrored.bottomRight.y).toBe(plain.bottomRight.y);
  });

  it('survives a frame with no size yet', () => {
    // The first frames can arrive before anything has been measured.
    expect(coverCorners({ width: 0, height: 0 }, { width: 100, height: 200 }, false)).toEqual({
      topLeft: { x: 0, y: 0 },
      bottomRight: { x: 100, y: 200 },
    });
  });
});

describe('displacement', () => {
  const still = { LEFT_EYE: { x: 0.6, y: 0.3 }, RIGHT_EYE: { x: 0.4, y: 0.3 } };

  it('is zero for a face that has not moved', () => {
    expect(displacement(still, still)).toBe(0);
  });

  it('averages across the landmarks both sets share', () => {
    // One point moved 0.1, the other not at all: the face moved 0.05 on
    // average. Averaging is what stops a single jittering landmark reading as
    // the whole head moving.
    const moved = { LEFT_EYE: { x: 0.7, y: 0.3 }, RIGHT_EYE: { x: 0.4, y: 0.3 } };
    expect(displacement(still, moved)).toBeCloseTo(0.05);
  });

  it('counts a face that has just arrived as movement', () => {
    // There was nothing to compare against, and an arrival is exactly the
    // moment worth showing the constellation for.
    expect(displacement(null, still)).toBe(1);
  });

  it('counts a face with nothing in common as movement', () => {
    expect(displacement(still, { MOUTH_BOTTOM: { x: 0.5, y: 0.8 } })).toBe(1);
  });
});
