/**
 * Turning MLKit's landmarks into something that can be drawn on the viewfinder.
 *
 * MLKit reports points in *frame* coordinates. The preview is a rounded box that
 * crops the frame to fill itself and mirrors it on the front camera, so a frame
 * point is nowhere near the view point it appears at. VisionCamera will convert
 * a single point for us, but that is a native round-trip each time and there are
 * ten of them per face per frame.
 *
 * So the screen converts two points — the corners of the face's bounding box —
 * and everything else is derived from those here, in arithmetic. Which is the
 * other reason this file exists: it imports nothing, so the Node-only test suite
 * can hold it to the 90% gate while the camera screen stays on the device where
 * it belongs.
 *
 * Nothing in this file reaches the model. The constellation is decoration.
 */

export interface Point {
  x: number;
  y: number;
}

/** MLKit's bounding box, in frame coordinates. */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The ten points MLKit gives us with `runLandmarks`, in the order they light up.
 *
 * Centre outwards, so it reads as the app finding a face rather than as a wipe
 * across one. `LEFT` is the subject's left, which is the right of the screen.
 */
export const LANDMARK_ORDER = [
  'LEFT_EYE',
  'RIGHT_EYE',
  'NOSE_BASE',
  'MOUTH_LEFT',
  'MOUTH_RIGHT',
  'MOUTH_BOTTOM',
  'LEFT_CHEEK',
  'RIGHT_CHEEK',
  'LEFT_EAR',
  'RIGHT_EAR',
] as const;

export type LandmarkKey = (typeof LANDMARK_ORDER)[number];

/** Which pairs get a line between them. A face, not a mesh. */
export const EDGES: readonly (readonly [LandmarkKey, LandmarkKey])[] = [
  ['LEFT_EYE', 'RIGHT_EYE'],
  ['LEFT_EYE', 'NOSE_BASE'],
  ['RIGHT_EYE', 'NOSE_BASE'],
  ['NOSE_BASE', 'MOUTH_LEFT'],
  ['NOSE_BASE', 'MOUTH_RIGHT'],
  ['MOUTH_LEFT', 'MOUTH_RIGHT'],
  ['MOUTH_LEFT', 'MOUTH_BOTTOM'],
  ['MOUTH_RIGHT', 'MOUTH_BOTTOM'],
  ['LEFT_EYE', 'LEFT_CHEEK'],
  ['RIGHT_EYE', 'RIGHT_CHEEK'],
  ['LEFT_CHEEK', 'LEFT_EAR'],
  ['RIGHT_CHEEK', 'RIGHT_EAR'],
];

/** A landmark set as it comes off the detector. Every key is optional. */
export type Landmarks = Partial<Record<LandmarkKey, Point>>;

/** Frame coordinates to view coordinates: scale, then translate. */
export interface Affine {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
}

export interface PlacedPoint extends Point {
  key: LandmarkKey;
}

/** A line, as the rotated 1px View that draws it. */
export interface EdgeGeometry {
  left: number;
  top: number;
  length: number;
  /** Degrees, because that is what RN's `rotate` transform wants. */
  angle: number;
}

/** The whole face, ready to render. */
export interface FaceGeometry {
  points: PlacedPoint[];
  edges: EdgeGeometry[];
  /** The bounding box in view coordinates — where the sweep runs. */
  box: { left: number; top: number; width: number; height: number };
}

/**
 * Derive the frame→view transform from the two converted corners.
 *
 * On the front camera the preview is mirrored, so the box's left edge converts
 * to a *larger* view x than its right edge. That comes out as a negative `sx`
 * on its own — there is no mirror flag to read and none to pass in.
 */
export function affineFromCorners(topLeft: Point, bottomRight: Point, bounds: Bounds): Affine {
  const sx = bounds.width === 0 ? 0 : (bottomRight.x - topLeft.x) / bounds.width;
  const sy = bounds.height === 0 ? 0 : (bottomRight.y - topLeft.y) / bounds.height;
  return { sx, sy, tx: topLeft.x - bounds.x * sx, ty: topLeft.y - bounds.y * sy };
}

export function apply(point: Point, affine: Affine): Point {
  return { x: point.x * affine.sx + affine.tx, y: point.y * affine.sy + affine.ty };
}

/**
 * The geometry of one line, as a View that starts at `a` and is rotated about
 * its own left edge — `transformOrigin: '0 50%'` on the RN side.
 */
export function edgeGeometry(a: Point, b: Point): EdgeGeometry {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return {
    left: a.x,
    top: a.y,
    length: Math.hypot(dx, dy),
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

/**
 * Everything the overlay needs, from what the detector reported.
 *
 * Landmarks MLKit did not find are dropped, and an edge is dropped with either
 * of its ends — a line to a point that is not drawn looks like a bug.
 */
export function project(landmarks: Landmarks, bounds: Bounds, affine: Affine): FaceGeometry {
  const placed = new Map<LandmarkKey, Point>();
  const points: PlacedPoint[] = [];

  for (const key of LANDMARK_ORDER) {
    const raw = landmarks[key];
    if (!raw) continue;
    const point = apply(raw, affine);
    placed.set(key, point);
    points.push({ key, ...point });
  }

  const edges: EdgeGeometry[] = [];
  for (const [from, to] of EDGES) {
    const a = placed.get(from);
    const b = placed.get(to);
    if (a && b) edges.push(edgeGeometry(a, b));
  }

  const corner = apply({ x: bounds.x, y: bounds.y }, affine);
  const opposite = apply({ x: bounds.x + bounds.width, y: bounds.y + bounds.height }, affine);

  return {
    points,
    edges,
    box: {
      left: Math.min(corner.x, opposite.x),
      top: Math.min(corner.y, opposite.y),
      width: Math.abs(opposite.x - corner.x),
      height: Math.abs(opposite.y - corner.y),
    },
  };
}

/**
 * Ease this frame's landmarks toward the last frame's.
 *
 * MLKit's output moves a pixel or two between frames on a perfectly still face,
 * and ten dots twitching in place reads as a rendering fault rather than as
 * tracking. `alpha` is how much of the new frame to take: 1 is the raw signal,
 * 0 never moves. A key absent from `previous` is taken whole, so a face that
 * has just arrived does not slide in from wherever the last one was.
 */
export function smooth(previous: Landmarks | null, next: Landmarks, alpha: number): Landmarks {
  if (!previous) return next;

  const eased: Landmarks = {};
  for (const key of LANDMARK_ORDER) {
    const to = next[key];
    if (!to) continue;

    const from = previous[key];
    eased[key] = from
      ? { x: from.x + (to.x - from.x) * alpha, y: from.y + (to.y - from.y) * alpha }
      : to;
  }
  return eased;
}
