import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { creditChipLabel } from '../format';
import { color, radius, space } from '../theme';
import { Body } from './Text';

/**
 * The credit count in the header.
 *
 * A filled black pill with a spark, and the spark is doing the labelling: there
 * is no room for the word "credits" and a bare number in a pill would be a
 * mystery. It is the same glyph the Try On pill spends a credit with, so the
 * thing counted here and the thing spent there read as one.
 */
export function CreditChip({ credits, onPress }: { credits: number; onPress?: () => void }) {
  const { t } = useTranslation();

  const content = (
    <View style={styles.chip}>
      <Body variant="caption" tone="paper" style={styles.spark}>
        ✦
      </Body>
      <Body variant="caption" weight="medium" tone="paper">
        {creditChipLabel(credits)}
      </Body>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('preview.creditsLeft', { count: credits })} onPress={onPress}>
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
    gap: 5,
  },
  // Sized off the pill's own badge, which is the other place a credit is drawn.
  spark: { fontSize: 14, lineHeight: 16 },
});
