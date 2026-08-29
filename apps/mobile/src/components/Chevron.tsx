import { StyleSheet, View } from 'react-native';
import { color } from '../theme';

/**
 * The back chevron, drawn rather than typed.
 *
 * The prototype sets a `‹` in the round button, and a guillemet is what a
 * browser had to hand — in the app it renders as a comma-sized tick in the
 * middle of a 34pt circle, because the glyph occupies a fraction of its em.
 * Two borders on a rotated box give the same mark at a size and a weight this
 * file chooses, and it cannot fall back to another face on another device.
 *
 * `size` is the chevron's arm, not its bounding box: the rotated square is
 * `size` on the diagonal, so 9 draws a mark about 13pt tall.
 *
 * The `left` is not a nudge by eye. Rotating the box sends the L's corner to
 * `0.707 * size` left of centre and both arm tips to the centre itself, so the
 * ink occupies the left half of a box the parent is dutifully centring. Half
 * that width — `0.354 * size` — puts the mark in the middle of the button. It
 * is `left` rather than a margin because an offset that changes the layout box
 * would be centred away again by the parent.
 */
export function Chevron({ tone = 'ink', size = 9 }: { tone?: keyof typeof color; size?: number }) {
  return (
    <View
      style={[
        styles.chevron,
        { width: size, height: size, borderColor: color[tone], left: size * 0.35 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  chevron: {
    borderLeftWidth: 1.6,
    borderBottomWidth: 1.6,
    transform: [{ rotate: '45deg' }],
  },
});
