import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color, type } from '../theme';
import { Meta } from './Text';

/**
 * The lockup: the mark, then LOXA.
 *
 * The mark is `assets/mark.png`, a raster copy of
 * `design-system/logo/loxa-mark.svg` — the app has no SVG renderer and adding
 * one to draw a single shape would be a poor trade. It is a black silhouette on
 * transparency, tinted at use, so the same file serves the ink screens and the
 * night ones.
 *
 * Sized off the type ramp rather than in points: the mark stands 1.3x the
 * letter height, which is what makes it read as part of the word instead of as
 * an icon parked beside it.
 */

const MARK = require('../../assets/mark.png');

/** 180x240 in the file, and the ratio the SVG's bounding box has. */
const MARK_ASPECT = 0.747;

interface Props {
  variant?: 'wordmark' | 'wordmarkSmall';
  tone?: 'ink' | 'paper';
  style?: StyleProp<ViewStyle>;
}

export function Wordmark({ variant = 'wordmark', tone = 'ink', style }: Props) {
  const height = type[variant].size * 1.3;

  return (
    <View style={[styles.row, style]}>
      <Image
        source={MARK}
        accessibilityIgnoresInvertColors
        style={{ height, width: height * MARK_ASPECT, tintColor: color[tone] }}
      />
      <Meta variant={variant} tone={tone}>
        Loxa
      </Meta>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
