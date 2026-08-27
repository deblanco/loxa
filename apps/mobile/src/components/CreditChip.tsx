import { Pressable, StyleSheet, View } from 'react-native';
import { creditChipLabel } from '../format';
import { color, radius, space } from '../theme';
import { Body } from './Text';

/**
 * The credit count in the header.
 *
 * A filled black pill with a dot, and the dot is doing the labelling: there is
 * no room for the word "credits" and a bare number in a pill would be a mystery.
 */
export function CreditChip({ credits, onPress }: { credits: number; onPress?: () => void }) {
  const content = (
    <View style={styles.chip}>
      <View style={styles.dot} />
      <Body variant="caption" weight="medium" tone="paper">
        {creditChipLabel(credits)}
      </Body>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${credits} credits left`} onPress={onPress}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 30,
    paddingHorizontal: space.s3,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: { width: 5, height: 5, borderRadius: radius.pill, backgroundColor: color.paper },
});
