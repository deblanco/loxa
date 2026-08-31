/**
 * The landmark constellation, as coordinates the viewfinder can draw.
 *
 * There is a detector behind these points again. There used to be MLKit, which
 * cost the app an entire native binary with no arm64 slice for the simulator,
 * so the whole project could only be built for a simulator that iOS 26 refuses
 * to run. It is now Apple Vision, through `modules/face-track` — a system
 * framework, which is the entire point: it has the simulator slice MLKit
 * lacked, and it is not a dependency so much as part of the phone.
 *
 * The transform survived that removal intact, which is why bringing tracking
 * back needed nothing here but the `'worklet'` directives: these functions run
 * on the camera's frame thread now, not on the JS thread.
 *
 * `IDLE_LANDMARKS` stays as the no-face state, so the oval is never empty while
 * somebody is still lining up a shot.
 *
 * The file imports nothing, so the Node-only test suite can hold it to the 90%
 * gate while the camera screen stays on the device where it belongs. That is
 * also what makes these safe as worklets.
 *
 * Face *validation* still happens where it should — on the photo, once, before
 * a credit is spent. See `src/photo.ts`. The constellation gates nothing.
 */

export interface Point {
  x: number;
  y: number;
}

/** A box in whatever space the points being mapped are in. */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The eight points of the constellation, in the order they light up.
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
];

/** A landmark set. Every key is optional: a point that is missing is not drawn. */
export type Landmarks = Partial<Record<LandmarkKey, Point>>;

/** One space to another: scale, then translate. */
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
  'worklet';
  const sx = bounds.width === 0 ? 0 : (bottomRight.x - topLeft.x) / bounds.width;
  const sy = bounds.height === 0 ? 0 : (bottomRight.y - topLeft.y) / bounds.height;
  return { sx, sy, tx: topLeft.x - bounds.x * sx, ty: topLeft.y - bounds.y * sy };
}

export function apply(point: Point, affine: Affine): Point {
  'worklet';
  return { x: point.x * affine.sx + affine.tx, y: point.y * affine.sy + affine.ty };
}

/**
 * The geometry of one line, as a View that starts at `a` and is rotated about
 * its own left edge — `transformOrigin: '0 50%'` on the RN side.
 */
export function edgeGeometry(a: Point, b: Point): EdgeGeometry {
  'worklet';
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
 * Landmarks that are absent are dropped, and an edge is dropped with either of
 * its ends — a line to a point that is not drawn looks like a bug.
 */
export function project(landmarks: Landmarks, bounds: Bounds, affine: Affine): FaceGeometry {
  'worklet';
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
 * A tracked face moves a pixel or two between frames even when it is perfectly
 * still, and ten dots twitching in place reads as a rendering fault rather than
 * as tracking. `alpha` is how much of the new frame to take: 1 is the raw signal,
 * 0 never moves. A key absent from `previous` is taken whole, so a face that
 * has just arrived does not slide in from wherever the last one was.
 */
export function smooth(previous: Landmarks | null, next: Landmarks, alpha: number): Landmarks {
  'worklet';
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

/** A width and a height, in whatever space is being described. */
export interface Size {
  width: number;
  height: number;
}

/**
 * Where the frame's corners land on a viewfinder that covers.
 *
 * The preview is `resizeMode="cover"`, so the frame is scaled until it fills
 * the view on both axes and the overflow is cropped evenly. These are the two
 * corners `affineFromCorners` wants — the same pair the native
 * `convertCameraPointToViewPoint` would return, computed here instead because
 * that method lives on a view ref the frame thread cannot reach.
 *
 * `mirrored` describes **the preview**, not the frame, and that distinction is
 * the whole bug it fixes. `isMirrored` on a Frame is a property of the output
 * it came from: the preview output is mirrored for the front camera, the frame
 * output is not. So the buffer the detector reads is un-mirrored while the
 * picture on screen is mirrored, and landmarks projected without a flip track
 * the wrong way — turn your head left and the constellation goes right.
 *
 * The caller passes what the *preview* is doing. Swapping the two x's arrives
 * at `affineFromCorners` as the negative `sx` that function already documents.
 *
 * A frame that arrives rotated is described by its displayed size, so the
 * caller swaps width and height for a sideways sensor before calling.
 */
export function coverCorners(
  frame: Size,
  view: Size,
  mirrored: boolean,
): { topLeft: Point; bottomRight: Point } {
  'worklet';
  if (frame.width <= 0 || frame.height <= 0) {
    return { topLeft: { x: 0, y: 0 }, bottomRight: { x: view.width, y: view.height } };
  }

  const scale = Math.max(view.width / frame.width, view.height / frame.height);
  const width = frame.width * scale;
  const height = frame.height * scale;
  // Negative when the frame is wider than the view, which is the crop.
  const left = (view.width - width) / 2;
  const top = (view.height - height) / 2;

  return mirrored
    ? { topLeft: { x: left + width, y: top }, bottomRight: { x: left, y: top + height } }
    : { topLeft: { x: left, y: top }, bottomRight: { x: left + width, y: top + height } };
}

/**
 * How far the face moved between two frames, in camera-space units.
 *
 * The mean distance across the landmarks both sets share, which is steadier
 * than any single point: one landmark jittering on a blink is not the face
 * moving, and averaging over eight of them says so.
 *
 * A face that has just arrived counts as motion — there was nothing to compare
 * it against, and its arrival is exactly the moment worth showing.
 */
export function displacement(previous: Landmarks | null, next: Landmarks): number {
  'worklet';
  if (!previous) return 1;

  let total = 0;
  let counted = 0;
  for (const key of LANDMARK_ORDER) {
    const from = previous[key];
    const to = next[key];
    if (!from || !to) continue;
    total += Math.hypot(to.x - from.x, to.y - from.y);
    counted += 1;
  }

  // No shared landmarks is not stillness — it is a different face, or the same
  // one seen freshly enough that nothing lines up.
  return counted === 0 ? 1 : total / counted;
}

/** The box the idle layout is written in: one unit wide, one unit tall. */
const UNIT_BOX: Bounds = { x: 0, y: 0, width: 1, height: 1 };

/**
 * A face, where the guide oval says one should be.
 *
 * Eight points in the unit box, laid out on the proportions of a face looking
 * straight ahead — eyes a little above the middle, mouth two thirds down,
 * cheeks out at the sides. `LEFT` is still the subject's left, which is the
 * right of the screen; the layout is symmetric, so nothing depends on that
 * reading.
 */
export const IDLE_LANDMARKS: Record<LandmarkKey, Point> = {
  LEFT_EYE: { x: 0.66, y: 0.36 },
  RIGHT_EYE: { x: 0.34, y: 0.36 },
  NOSE_BASE: { x: 0.5, y: 0.54 },
  MOUTH_LEFT: { x: 0.61, y: 0.7 },
  MOUTH_RIGHT: { x: 0.39, y: 0.7 },
  MOUTH_BOTTOM: { x: 0.5, y: 0.76 },
  LEFT_CHEEK: { x: 0.75, y: 0.55 },
  RIGHT_CHEEK: { x: 0.25, y: 0.55 },
};

/**
 * The constellation, over a rectangle in view coordinates.
 *
 * `rect` is the guide oval's frame, so the dots land where the user is being
 * asked to put their face. It is a function of the viewfinder's layout and
 * nothing else, which is the point: it is computed when the layout arrives and
 * never again, and the screen re-renders no more often than it does today.
 */
export function idleGeometry(rect: Bounds): FaceGeometry {
  'worklet';
  const affine = affineFromCorners(
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    UNIT_BOX,
  );
  return project(IDLE_LANDMARKS, UNIT_BOX, affine);
}
