import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color, radius, shadow, space } from '../theme';
import { Body } from './Text';

/**
 * Every button in the app.
 *
 * Three tones and nothing else, which is the design system's "one weight of
 * black for every control" made structural: `filled` is ink on paper, `light`
 * is paper on night, and `quiet` is a hairline outline. A fourth would be a new
 * colour, and there is no new colour.
 */
type Tone = 'filled' | 'light' | 'quiet' | 'quietOnNight';

interface Props {
  label: string;
  onPress: () => void;
  tone?: Tone;
  /** Credit price, drawn as a sparkle and a numeral against the right edge. */
  cost?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const HEIGHT: Record<Tone, number> = {
  filled: 56,
  light: 56,
  quiet: 48,
  quietOnNight: 46,
};

export function Pill({ label, onPress, tone = 'filled', cost, disabled, style }: Props) {
  const filled = tone === 'filled';
  const light = tone === 'light';
  const costTone = filled ? 'paper50' : 'ink45';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { height: HEIGHT[tone] },
        filled && styles.filled,
        light && styles.light,
        tone === 'quiet' && styles.quiet,
        tone === 'quietOnNight' && styles.quietOnNight,
        (pressed || disabled) && styles.pressed,
        style,
      ]}
    >
      <Body
        variant="button"
        weight="medium"
        tone={filled ? 'paper' : light ? 'ink' : tone === 'quiet' ? 'ink60' : 'paper85'}
      >
        {label}
      </Body>
      {cost != null ? (
        <View style={styles.cost} pointerEvents="none">
          <Body variant="caption" tone={costTone} style={styles.sparkle}>
            ✦
          </Body>
          <Body variant="caption" weight="medium" tone={costTone}>
            {cost}
          </Body>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s2,
    paddingHorizontal: space.s5,
  },
  filled: { backgroundColor: color.ink, ...shadow.control },
  light: { backgroundColor: color.paper },
  quiet: { borderWidth: 1, borderColor: color.ink18 },
  quietOnNight: { borderWidth: 1, borderColor: color.paper30 },
  pressed: { opacity: 0.88 },
  cost: {
    position: 'absolute',
    right: space.s5,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sparkle: { fontSize: 23.4, lineHeight: 27 },
});
