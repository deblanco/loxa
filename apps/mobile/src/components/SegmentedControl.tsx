import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius, space } from '../theme';
import { Body } from './Text';

/** Saved photo / New photo. Two options, a trough, and the same one black. */
interface Props<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.track}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected && styles.selected]}
          >
            <Body variant="bodySmall" tone={selected ? 'paper' : 'ink55'}>
              {option.label}
            </Body>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    padding: 3,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceTrack,
    borderWidth: 1,
    borderColor: color.ink09,
  },
  option: {
    flex: 1,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: color.ink },
});
