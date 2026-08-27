import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LANDMARK_ORDER, type FaceGeometry, type LandmarkKey } from '../face/geometry';
import { color, motion, radius } from '../theme';

/**
 * The landmark constellation, over the viewfinder.
 *
 * Ten points where MLKit found them, lines between the pairs that make a face,
 * and a hairline that walks from crown to chin forever. It is decoration: it
 * gates nothing, and none of it is sent anywhere. What it says is that the app
 * is looking at *this* face, which is the same promise the render makes.
 *
 * Two kinds of motion, and the system allows no third: the dots arriving is a
 * state change (eased, staggered, `motion.instant` each) and the sweep is
 * ambience (linear, looping, `motion.scan`). Both on the native driver, because
 * the JS thread is already carrying a detector.
 *
 * Positions are not animated. `smooth()` in `face/geometry` has already taken
 * the twitch out of them upstream, and animating a value that is replaced ten
 * times a second only adds lag.
 */
interface Props {
  /** The face as it should be drawn, or null when there isn't one. */
  geometry: FaceGeometry | null;
}

/** How far apart the dots light up. Ten of them, so the lock reads as ~360ms. */
const STAGGER = 40;

export function FaceConstellation({ geometry }: Props) {
  // The last face we saw, kept so the group can fade out over something rather
  // than vanishing the instant the detector loses it.
  const last = useRef<FaceGeometry | null>(geometry);
  if (geometry) last.current = geometry;

  // Built once, on the first render rather than on every one: this screen
  // re-renders as fast as the detector reports, and ten values thrown away ten
  // times a second is litter on the thread the detector is already using.
  const store = useRef<Record<LandmarkKey, Animated.Value> | null>(null);
  if (!store.current) {
    store.current = Object.fromEntries(
      LANDMARK_ORDER.map((key) => [key, new Animated.Value(0)]),
    ) as Record<LandmarkKey, Animated.Value>;
  }
  const dots = store.current;
  const links = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  const present = geometry !== null;

  useEffect(() => {
    const values = LANDMARK_ORDER.map((key) => dots[key]);
    const animation = present
      ? Animated.parallel([
          Animated.stagger(
            STAGGER,
            values.map((value) =>
              Animated.timing(value, {
                toValue: 1,
                duration: motion.instant,
                easing: Easing.ease,
                useNativeDriver: true,
              }),
            ),
          ),
          // The lines follow the points rather than arriving with them, so the
          // face is joined up only once it has been found.
          Animated.timing(links, {
            toValue: 1,
            duration: motion.normal,
            delay: LANDMARK_ORDER.length * STAGGER,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      : Animated.parallel(
          [...values, links].map((value) =>
            Animated.timing(value, {
              toValue: 0,
              duration: motion.instant,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
          ),
        );

    animation.start();
    return () => animation.stop();
  }, [present, dots, links]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: motion.scan,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  const face = last.current;
  if (!face) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {face.edges.map((edge, i) => (
        <Animated.View
          key={i}
          style={[
            styles.link,
            {
              left: edge.left,
              top: edge.top,
              width: edge.length,
              opacity: links,
              transform: [{ rotate: `${edge.angle}deg` }],
            },
          ]}
        />
      ))}

      {face.points.map((point) => (
        <Animated.View
          key={point.key}
          style={[styles.dot, { left: point.x, top: point.y, opacity: dots[point.key] }]}
        />
      ))}

      <View
        style={[
          styles.sweepBox,
          { left: face.box.left, top: face.box.top, width: face.box.width, height: face.box.height },
        ]}
      >
        <Animated.View
          style={[
            styles.sweep,
            {
              opacity: Animated.multiply(
                links,
                sweep.interpolate({
                  inputRange: [0, 0.12, 0.88, 1],
                  outputRange: [0, 1, 1, 0],
                }),
              ),
              transform: [
                {
                  translateY: sweep.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, face.box.height],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
    </View>
  );
}

const DOT = 3;

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
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
  sweepBox: { position: 'absolute', overflow: 'hidden' },
  sweep: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: color.paper50 },
});
