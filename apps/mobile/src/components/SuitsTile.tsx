import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { color, motion, radius, space } from '../theme';
import { Body } from './Text';

/**
 * The one tile in the strip that is not a cut.
 *
 * Everything either side of it is a photograph of somebody wearing hair. This
 * asks a model to read *your* face, which is a different kind of thing, and it
 * has to look like one without looking like a tile whose picture failed to
 * load — which is what a flat black square with a mark on it reads as.
 *
 * So: the user's own face behind it, blurred past recognition, with a wand
 * over it and a glow that breathes. Blurred because the tile is seventy points
 * wide and a face at that size is a thumbnail of somebody rather than a
 * suggestion about them — and because the mark has to stay legible over
 * whatever photograph happens to be there. Until a portrait exists it is a
 * face from the catalogue, blurred the same way, so the tile never reads as
 * an empty slot.
 *
 * The glow is the sixth ambient loop in a design system that argues carefully
 * for each one, and the argument for this one is that it is exactly the rule's
 * stated exception — a single object, not a loop running under twenty-four
 * tiles at once. It is also the only affordance in the app that offers to
 * think about you rather than to show you something, and the strip gives it
 * seventy points to say so.
 */
export function SuitsTile({
  label,
  hint,
  uri,
  onPress,
}: {
  label: string;
  hint: string;
  /** The user's portrait, or a catalogue face when they have not set one. */
  uri?: string;
  onPress: () => void;
}) {
  const glow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: motion.shimmer,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.4,
          duration: motion.shimmer,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  return (
    <Pressable accessibilityRole="button" accessibilityHint={hint} onPress={onPress} style={styles.tile}>
      <View style={styles.face}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={18} />
        ) : null}

        {/* Over the photograph rather than instead of it: the wand and its
            glow are paper, and paper on an unknown photograph is a coin toss.
            Darkest at the bottom, where the label sits. */}
        <LinearGradient
          colors={[color.scrim, color.scrimStrong]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/*
          A light the mark stands in. Three circles rather than one, because
          a single flat disc is a grey coin on a black square — without an SVG
          runtime there is no radial gradient, and stacked alphas are how this
          app has always faked a falloff.
        */}
        <Animated.View style={[styles.glowWrap, { opacity: glow }]} pointerEvents="none">
          <View style={[styles.glow, styles.glowWide]} />
          <View style={[styles.glow, styles.glowCore]} />
        </Animated.View>

        <Wand />
      </View>

      <Body variant="tile" style={styles.name}>
        {label}
      </Body>
    </Pressable>
  );
}

/**
 * A wand, drawn rather than typed.
 *
 * ✦ belongs to credits and ✓ to selection, and at this size a typeface's own
 * wand is a hinting lottery — the same argument `PlusBadge` and `SuitsSeal`
 * make. A bar on the diagonal, a four-point star at its tip, two sparks
 * falling off it.
 */
function Wand() {
  return (
    <View style={styles.wand} pointerEvents="none">
      <View style={styles.shaft} />
      {/*
        A glyph here, against this file's own rule that marks are drawn.

        The rule exists because a typeface's ＋ or ✓ at fifteen points is a
        hinting lottery, and because a drawn mark cannot go missing. Neither
        applies to a star: two crossed rectangles draw a plus sign, not a
        sparkle — the points of a star are concave and views have no curves —
        and ✧ is in the same font the rest of this screen is set in.

        ✧ and not ✦: the filled one is the credit mark, on the chip and on
        every pill that spends one.
      */}
      <Body style={styles.starTip}>✧</Body>
      <View style={[styles.spark, styles.sparkOne]} />
      <View style={[styles.spark, styles.sparkTwo]} />
    </View>
  );
}

const TILE = 70;
const THUMB_HEIGHT = 84;

const styles = StyleSheet.create({
  tile: { width: TILE },
  face: {
    height: THUMB_HEIGHT,
    borderRadius: radius.tile,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: { position: 'absolute', borderRadius: radius.pill },
  glowWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Two circles, the inner one brighter: overlapping alphas are the nearest
  // thing to a falloff in an app with no radial gradient.
  glowWide: { width: 66, height: 66, backgroundColor: color.paper16, opacity: 0.35 },
  glowCore: { width: 34, height: 34, backgroundColor: color.paper16, opacity: 0.6 },
  wand: { width: 36, height: 36 },
  // Bottom-left to top-right, with the star sitting off its end: a wand is
  // read from the hand outwards.
  shaft: {
    position: 'absolute',
    left: 6,
    bottom: 8,
    width: 22,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: color.paper,
    transform: [{ rotate: '-45deg' }],
  },
  starTip: {
    position: 'absolute',
    right: -2,
    top: -6,
    fontSize: 20,
    lineHeight: 24,
    color: color.paper,
  },
  // Dots, not more stars: two more glyphs at six points would be a hinting
  // lottery, and what falls off a wand is light rather than shapes.
  spark: { position: 'absolute', borderRadius: radius.pill, backgroundColor: color.paper60 },
  sparkOne: { right: 14, top: 13, width: 3.5, height: 3.5 },
  sparkTwo: { left: 4, top: 7, width: 2.5, height: 2.5 },
  name: { marginTop: space.s1 + 2, textAlign: 'center' },
});
