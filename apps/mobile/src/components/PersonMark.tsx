import { StyleSheet, View } from 'react-native';
import { color, radius } from '../theme';

/**
 * The head-and-shoulders mark for an avatar with no photograph in it yet.
 *
 * Drawn from views, like the `Chevron` and the `FlipIcon`, for the same reason
 * — the app owns no SVG runtime, and a typeface's ☺ or 👤 is a hinting lottery
 * at seventeen points and a different drawing on every phone.
 *
 * It fills its parent rather than taking a `size`, and every dimension is a
 * percentage, so the same component draws the 34pt header circle and anything
 * larger without a scale factor being passed down. The parent is the plate,
 * which is already round and already clips.
 *
 * That clipping is the whole trick: the shoulders are 118% tall on purpose and
 * run off the bottom edge, which is what makes them read as shoulders rather
 * than as a lozenge floating under a dot. A shape that stopped inside the
 * circle would need a flat bottom in mid-air.
 *
 * Quiet on purpose. This sits where a face will be, and an empty state that
 * shouts is one the user reads as content.
 */
export function PersonMark({ tone = 'ink30' }: { tone?: keyof typeof color }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.head, { backgroundColor: color[tone] }]} />
      <View style={[styles.shoulders, { backgroundColor: color[tone] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    position: 'absolute',
    left: '29%',
    top: '20%',
    width: '42%',
    aspectRatio: 1,
    borderRadius: radius.pill,
  },
  shoulders: {
    position: 'absolute',
    left: '13%',
    top: '72%',
    width: '74%',
    height: '46%',
    borderTopLeftRadius: radius.pill,
    borderTopRightRadius: radius.pill,
  },
});
