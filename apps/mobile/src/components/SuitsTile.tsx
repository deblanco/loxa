import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { EDGES, IDLE_LANDMARKS, LANDMARK_ORDER } from '../face/geometry';
import { color, motion, radius, space } from '../theme';
import { Body } from './Text';

/**
 * The one tile in the strip that is not a cut.
 *
 * Everything either side of it is a photograph of somebody wearing hair; this
 * offers to read *your* face and say what would suit it. It has to look like a
 * different kind of thing without looking like a tile whose picture failed to
 * load — which is what a flat fill with a mark on it reads as, and what the
 * first two attempts at this were.
 *
 * So it does the thing instead of symbolising it. The user's own face goes
 * dark under ink, the eight landmarks the camera tracks are drawn over it in
 * paper, and a light sweeps down the tile and brightens each one as it passes.
 * A wand would have been the generic mark for "magic"; this is the only mark
 * in the app that means *face-reading*, and the viewfinder already speaks it.
 *
 * The sweep is `motion.scan` — the camera's own landmark sweep, at the same
 * pace, so this is a second instance of a loop the system already sanctions
 * rather than a sixth kind of movement.
 */
export function SuitsTile({
  label,
  hint,
  uri,
  onPress,
}: {
  label: string;
  hint: string;
  /** The user's portrait, or a catalogue face until they have set one. */
  uri?: string;
  onPress: () => void;
}) {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: motion.scan,
        // Linear, because ambience does not accelerate — the design system is
        // explicit that a loop is not a state change.
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  return (
    <Pressable accessibilityRole="button" accessibilityHint={hint} onPress={onPress} style={styles.tile}>
      <View style={styles.face}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={12} />
        ) : null}

        {/* The photograph is texture here, not subject: the landmarks are what
            the tile is about, and paper hairlines over an unmanaged photo are
            a coin toss. */}
        <View style={styles.ink} />

        {LANDMARK_ORDER.map((key) => (
          <Landmark key={key} landmark={key} sweep={sweep} />
        ))}

        {EDGES.map(([from, to]) => (
          <Link key={`${from}-${to}`} from={from} to={to} />
        ))}

        <Animated.View
          style={[
            styles.sweep,
            {
              transform: [
                {
                  translateY: sweep.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-SWEEP, THUMB_HEIGHT],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['transparent', color.paper30, 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      <Body variant="tile" style={styles.name}>
        {label}
      </Body>
    </Pressable>
  );
}

/**
 * One landmark, lit as the sweep crosses it.
 *
 * Resting at a little over a third and reaching full paper in the band either
 * side of its own row: the tile reads as a scan finding a face rather than as
 * eight dots blinking on a timer.
 */
function Landmark({ landmark, sweep }: { landmark: keyof typeof IDLE_LANDMARKS; sweep: Animated.Value }) {
  const point = IDLE_LANDMARKS[landmark];
  const at = point.y;

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          left: point.x * THUMB_WIDTH - DOT / 2,
          top: point.y * THUMB_HEIGHT - DOT / 2,
          opacity: sweep.interpolate({
            inputRange: [Math.max(0, at - 0.22), at, Math.min(1, at + 0.22)],
            outputRange: [0.38, 1, 0.38],
            extrapolate: 'clamp',
          }),
        },
      ]}
      pointerEvents="none"
    />
  );
}

/** One hairline between two landmarks, laid out once from the idle geometry. */
function Link({ from, to }: { from: keyof typeof IDLE_LANDMARKS; to: keyof typeof IDLE_LANDMARKS }) {
  const a = IDLE_LANDMARKS[from];
  const b = IDLE_LANDMARKS[to];

  const ax = a.x * THUMB_WIDTH;
  const ay = a.y * THUMB_HEIGHT;
  const dx = b.x * THUMB_WIDTH - ax;
  const dy = b.y * THUMB_HEIGHT - ay;

  return (
    <View
      style={[
        styles.link,
        {
          left: ax,
          top: ay,
          width: Math.hypot(dx, dy),
          transform: [{ rotate: `${(Math.atan2(dy, dx) * 180) / Math.PI}deg` }],
        },
      ]}
      pointerEvents="none"
    />
  );
}

const THUMB_WIDTH = 70;
const THUMB_HEIGHT = 84;
const DOT = 3;

/** How tall the band of light is. A quarter of the tile reads as a sweep. */
const SWEEP = 22;

const styles = StyleSheet.create({
  tile: { width: THUMB_WIDTH },
  face: {
    height: THUMB_HEIGHT,
    borderRadius: radius.tile,
    overflow: 'hidden',
    backgroundColor: color.ink,
  },
  ink: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.scrimStrong,
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: radius.pill,
    backgroundColor: color.paper,
  },
  link: {
    position: 'absolute',
    height: 1,
    backgroundColor: color.paper16,
    transformOrigin: '0 50%',
  },
  sweep: { position: 'absolute', left: 0, right: 0, height: SWEEP },
  name: { marginTop: space.s1 + 2, textAlign: 'center' },
});
