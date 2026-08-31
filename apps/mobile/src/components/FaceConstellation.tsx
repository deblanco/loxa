import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { EDGES, LANDMARK_ORDER, type FaceGeometry, type LandmarkKey } from '../face/geometry';
import { color, motion, radius } from '../theme';

/**
 * The landmark constellation, over the viewfinder.
 *
 * Eight points on the face and the lines between the pairs that make one. It is
 * decoration: it gates no shutter and none of it is sent anywhere. What it says
 * is that the app is looking at a face, which is the same promise the render
 * makes.
 *
 * The points move now. They are driven by `modules/face-track` — Apple Vision,
 * on the camera's own thread — so the whole component runs on shared values and
 * never re-renders: a face arriving, moving or leaving changes no React state.
 * That is the same guarantee the static version had, kept while the geometry
 * became live.
 *
 * `tracked` is the detected face and `idle` is the layout inside the guide
 * oval. Falling back to the oval rather than to nothing is what keeps the
 * viewfinder from emptying while somebody is still lining a shot up.
 *
 * It answers movement rather than a timer. A constellation that never leaves
 * stops reading as detection and starts reading as a decal printed on the
 * glass, and it sits over the one thing the user is trying to look at — their
 * own face. One that comes and goes on a clock is no better: it is obviously
 * ignoring them.
 *
 * So the camera screen measures how far the face moved between frames and this
 * follows: it finds you when you move, holds while you are moving, and clears
 * away when you settle. Which is also honest — a face being tracked is exactly
 * when there is something to show.
 *
 * One kind of motion now: the dots arriving are a state change, eased and
 * staggered, `motion.instant` each. There is no ambient loop — nothing here
 * moves untouched, because everything it does is an answer to the face.
 */
interface Props {
  /** The face the detector found, or null when it has found none. */
  tracked: SharedValue<FaceGeometry | null>;
  /** Where the constellation rests when there is no face. */
  idle: SharedValue<FaceGeometry | null>;
  /** 1 while the face is moving, 0 once it has settled. */
  moving: SharedValue<number>;
}

/** How far apart the dots light up. Ten of them, so the lock reads as ~360ms. */
const STAGGER = 40;

export function FaceConstellation({ tracked, idle, moving }: Props) {
  // Whichever face is current. Derived rather than branched at each use, so the
  // fallback is decided once per frame instead of twenty-two times.
  const face = useDerivedValue(() => tracked.value ?? idle.value);

  const links = useSharedValue(0);

  // What everything is multiplied by. `moving` flips between 0 and 1 on the
  // frame thread, and this eases across on the UI thread — a hard cut would
  // read as a glitch rather than as the app noticing something.
  const cycle = useDerivedValue(() =>
    withTiming(moving.value, { duration: motion.fade, easing: Easing.ease }),
  );

  // The lines follow the points rather than arriving with them, so the face is
  // joined up only once it has been found.
  useEffect(() => {
    links.value = withDelay(
      LANDMARK_ORDER.length * STAGGER,
      withTiming(1, { duration: motion.normal, easing: Easing.ease }),
    );
  }, [links]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {EDGES.map(([from, to], index) => (
        <Link key={`${from}-${to}`} face={face} index={index} opacity={links} cycle={cycle} />
      ))}

      {LANDMARK_ORDER.map((key, index) => (
        <Dot key={key} face={face} landmark={key} index={index} cycle={cycle} />
      ))}

    </View>
  );
}

/**
 * One landmark.
 *
 * Absent from the geometry means absent from the screen: `project` drops a
 * point the detector did not report, and a dot left behind at the last place a
 * missing landmark was seen is worse than no dot.
 */
function Dot({
  face,
  landmark,
  index,
  cycle,
}: {
  face: SharedValue<FaceGeometry | null>;
  landmark: LandmarkKey;
  index: number;
  cycle: SharedValue<number>;
}) {
  // Its own entrance, delayed by its place in the order, so the constellation
  // lights up centre-outwards rather than arriving all at once.
  const entrance = useSharedValue(0);
  useEffect(() => {
    entrance.value = withDelay(
      index * STAGGER,
      withTiming(1, { duration: motion.instant, easing: Easing.ease }),
    );
  }, [entrance, index]);

  const style = useAnimatedStyle(() => {
    const point = face.value?.points.find((candidate) => candidate.key === landmark);
    if (!point) return { opacity: 0 };
    return {
      opacity: entrance.value * cycle.value,
      transform: [{ translateX: point.x }, { translateY: point.y }],
    };
  });

  return <Animated.View style={[styles.dot, style]} />;
}

/** One line, positioned and rotated about its own first point. */
function Link({
  face,
  index,
  opacity,
  cycle,
}: {
  face: SharedValue<FaceGeometry | null>;
  index: number;
  opacity: SharedValue<number>;
  cycle: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    // The edges are built in `EDGES` order, but any whose ends were not both
    // found is dropped — so this index is not a position in `EDGES`.
    const edge = face.value?.edges[index];
    if (!edge) return { opacity: 0 };
    return {
      opacity: opacity.value * cycle.value,
      width: edge.length,
      transform: [
        { translateX: edge.left },
        { translateY: edge.top },
        { rotate: `${edge.angle}deg` },
      ],
    };
  });

  return <Animated.View style={[styles.link, style]} />;
}

const DOT = 3;

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    // Translated rather than positioned, so the transform runs on the UI thread
    // without a layout pass. The offset centres the dot on its landmark.
    marginLeft: -DOT / 2,
    marginTop: -DOT / 2,
    borderRadius: radius.pill,
    backgroundColor: color.paper60,
  },
  link: {
    position: 'absolute',
    height: 1,
    backgroundColor: color.paper16,
    // The line starts at its first point and turns about it, rather than about
    // its own middle, which is where RN would put it by default.
    transformOrigin: '0 50%',
  },
});
