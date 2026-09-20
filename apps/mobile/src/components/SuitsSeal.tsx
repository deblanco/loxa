import { StyleSheet, View } from 'react-native';
import { color, radius } from '@/theme';

/**
 * The mark on a cut that suits the face in the photograph.
 *
 * A seal rather than a label. It used to be the words "suits you" across the
 * bottom of the tile, which at 70 points is a caption lying over somebody's
 * face — the tile is a photograph, and the photograph is the reason the strip
 * works at all. The words survive for a screen reader, on the tile's
 * accessibility hint.
 *
 * Built like `PlusBadge` on the preview header and for the same reason: an ink
 * disc ringed in paper, floating on a corner. The ring is what makes it legible
 * over an arbitrary photograph — over pale hair a plain ink disc is a smudge,
 * and the design system's one shadow is for black controls on paper, not for
 * marks on pictures.
 *
 * The mark inside is a square turned forty-five degrees, drawn rather than
 * typed. ✓ belongs to selection and ✦ to credits; a third meaning needs a third
 * shape, and at six points a glyph is a hinting lottery.
 */
export function SuitsSeal() {
  return (
    <View style={styles.seal} pointerEvents="none">
      <View style={styles.mark} />
    </View>
  );
}

const styles = StyleSheet.create({
  seal: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    borderWidth: 1.5,
    borderColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 6,
    height: 6,
    backgroundColor: color.paper,
    transform: [{ rotate: '45deg' }],
  },
});
