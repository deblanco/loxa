import { describe, expect, it } from 'vitest';
import {
  affineFromCorners,
  apply,
  edgeGeometry,
  idleGeometry,
  project,
  smooth,
  EDGES,
  IDLE_LANDMARKS,
  LANDMARK_ORDER,
  type Landmarks,
} from '../src/face/geometry';

/** A face 100×120 at (200, 300), as a detector would once have reported it. */
const BOUNDS = { x: 200, y: 300, width: 100, height: 120 };

describe('affineFromCorners', () => {
  it('maps the bounds onto the corners it was built from', () => {
    const topLeft = { x: 10, y: 20 };
    const bottomRight = { x: 210, y: 260 };
    const affine = affineFromCorners(topLeft, bottomRight, BOUNDS);

    expect(apply({ x: BOUNDS.x, y: BOUNDS.y }, affine)).toEqual(topLeft);
    expect(
      apply({ x: BOUNDS.x + BOUNDS.width, y: BOUNDS.y + BOUNDS.height }, affine),
    ).toEqual(bottomRight);
  });

  it('reads a mirrored preview as a negative x scale', () => {
    // The front camera mirrors, so the box's left edge lands to the *right* of
    // its right edge. Nothing tells us that but the order of the two corners.
    const affine = affineFromCorners({ x: 210, y: 20 }, { x: 10, y: 260 }, BOUNDS);

    expect(affine.sx).toBeLessThan(0);
    expect(affine.sy).toBeGreaterThan(0);
  });

  it('does not divide by a zero-sized face', () => {
    const affine = affineFromCorners({ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 0, y: 0, width: 0, height: 0 });

    expect(affine.sx).toBe(0);
    expect(affine.sy).toBe(0);
    expect(Number.isFinite(affine.tx)).toBe(true);
    expect(Number.isFinite(affine.ty)).toBe(true);
  });
});

describe('edgeGeometry', () => {
  it('measures a 3-4-5 triangle', () => {
    const edge = edgeGeometry({ x: 10, y: 10 }, { x: 13, y: 14 });

    expect(edge.left).toBe(10);
    expect(edge.top).toBe(10);
    expect(edge.length).toBeCloseTo(5);
    expect(edge.angle).toBeCloseTo(53.13, 1);
  });

  it('gives a flat line no rotation', () => {
    expect(edgeGeometry({ x: 0, y: 7 }, { x: 40, y: 7 }).angle).toBe(0);
  });

  it('turns anticlockwise for a point above', () => {
    expect(edgeGeometry({ x: 0, y: 0 }, { x: 0, y: -10 }).angle).toBe(-90);
  });
});

describe('project', () => {
  const identity = affineFromCorners(
    { x: BOUNDS.x, y: BOUNDS.y },
    { x: BOUNDS.x + BOUNDS.width, y: BOUNDS.y + BOUNDS.height },
    BOUNDS,
  );

  const full: Landmarks = Object.fromEntries(
    LANDMARK_ORDER.map((key, i) => [key, { x: 200 + i, y: 300 + i }]),
  );

  it('places every landmark it was given, in order', () => {
    const geometry = project(full, BOUNDS, identity);

    expect(geometry.points.map((p) => p.key)).toEqual([...LANDMARK_ORDER]);
    expect(geometry.edges).toHaveLength(EDGES.length);
  });

  it('drops an edge when either end is missing', () => {
    const { NOSE_BASE: _dropped, ...withoutNose } = full;
    const geometry = project(withoutNose, BOUNDS, identity);

    // The nose is one end of four of the twelve edges.
    expect(geometry.points).toHaveLength(LANDMARK_ORDER.length - 1);
    expect(geometry.edges).toHaveLength(EDGES.length - 4);
  });

  it('reports a positive box even when the preview is mirrored', () => {
    const mirrored = affineFromCorners({ x: 210, y: 20 }, { x: 10, y: 260 }, BOUNDS);
    const geometry = project(full, BOUNDS, mirrored);

    expect(geometry.box.left).toBe(10);
    expect(geometry.box.top).toBe(20);
    expect(geometry.box.width).toBe(200);
    expect(geometry.box.height).toBe(240);
  });

  it('returns nothing to draw for a face with no landmarks', () => {
    const geometry = project({}, BOUNDS, identity);

    expect(geometry.points).toEqual([]);
    expect(geometry.edges).toEqual([]);
  });
});

describe('smooth', () => {
  const previous: Landmarks = { LEFT_EYE: { x: 0, y: 0 } };
  const next: Landmarks = { LEFT_EYE: { x: 10, y: 20 } };

  it('takes the whole frame when there is nothing to ease from', () => {
    expect(smooth(null, next, 0.35)).toBe(next);
  });

  it('takes the whole frame at alpha 1', () => {
    expect(smooth(previous, next, 1)).toEqual(next);
  });

  it('does not move at alpha 0', () => {
    expect(smooth(previous, next, 0)).toEqual(previous);
  });

  it('eases part of the way in between', () => {
    expect(smooth(previous, next, 0.25)).toEqual({ LEFT_EYE: { x: 2.5, y: 5 } });
  });

  it('takes a newly-found landmark whole rather than sliding it in', () => {
    // The mouth was not in the last frame, so there is no sensible place to
    // start it from — anywhere but where it is would be a visible slide.
    const arriving: Landmarks = { LEFT_EYE: { x: 10, y: 20 }, MOUTH_BOTTOM: { x: 99, y: 99 } };

    expect(smooth(previous, arriving, 0.5)).toEqual({
      LEFT_EYE: { x: 5, y: 10 },
      MOUTH_BOTTOM: { x: 99, y: 99 },
    });
  });

  it('forgets a landmark the detector stopped reporting', () => {
    expect(smooth({ ...previous, MOUTH_BOTTOM: { x: 1, y: 1 } }, next, 1)).toEqual(next);
  });
});

describe('idleGeometry', () => {
  /** The guide oval's frame, as the viewfinder measures it. */
  const RECT = { x: 52, y: 100, width: 260, height: 400 };

  it('draws every point, inside the rectangle it was given', () => {
    const geometry = idleGeometry(RECT);

    expect(geometry.points).toHaveLength(LANDMARK_ORDER.length);
    for (const point of geometry.points) {
      expect(point.x).toBeGreaterThanOrEqual(RECT.x);
      expect(point.x).toBeLessThanOrEqual(RECT.x + RECT.width);
      expect(point.y).toBeGreaterThanOrEqual(RECT.y);
      expect(point.y).toBeLessThanOrEqual(RECT.y + RECT.height);
    }
  });

  it('keeps the order the dots light up in', () => {
    expect(idleGeometry(RECT).points.map((point) => point.key)).toEqual([...LANDMARK_ORDER]);
  });

  it('draws every edge, because no landmark is ever missing', () => {
    expect(idleGeometry(RECT).edges).toHaveLength(EDGES.length);
  });

  it('boxes the rectangle itself, so the sweep runs over the oval', () => {
    expect(idleGeometry(RECT).box).toEqual({
      left: RECT.x,
      top: RECT.y,
      width: RECT.width,
      height: RECT.height,
    });
  });

  it('scales with the rectangle rather than sitting at a fixed size', () => {
    const small = idleGeometry(RECT);
    const large = idleGeometry({ ...RECT, width: RECT.width * 2, height: RECT.height * 2 });

    expect(large.box.width).toBe(small.box.width * 2);
    expect(large.points[0].x - RECT.x).toBeCloseTo((small.points[0].x - RECT.x) * 2);
  });

  it('lays the face out symmetrically about the midline', () => {
    // The pairs are mirrored, so the layout survives a preview that isn't.
    const pairs = [
      ['LEFT_EYE', 'RIGHT_EYE'],
      ['MOUTH_LEFT', 'MOUTH_RIGHT'],
      ['LEFT_CHEEK', 'RIGHT_CHEEK'],
    ] as const;

    for (const [left, right] of pairs) {
      expect(IDLE_LANDMARKS[left].x + IDLE_LANDMARKS[right].x).toBeCloseTo(1);
      expect(IDLE_LANDMARKS[left].y).toBeCloseTo(IDLE_LANDMARKS[right].y);
    }
  });
});
