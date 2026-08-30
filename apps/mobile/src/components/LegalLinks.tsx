import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { openPrivacy, openTerms } from '../legal';
import { Meta } from './Text';

/**
 * Terms and privacy, small and out of the way, under a purchase.
 *
 * Required by App Store review at every point of purchase, not only in
 * settings. Set in mono at meta size so it reads as the fine print it is — the
 * offer above it should stay the loudest thing on the screen — but it is a real
 * tap target, not decoration.
 */
export function LegalLinks({ onNight }: { onNight?: boolean }) {
  const { t } = useTranslation();
  const tone = onNight ? 'paper50' : 'ink40';

  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="link" onPress={openTerms} hitSlop={8}>
        <Meta variant="note" tone={tone} sentence style={styles.link}>
          {t('legal.terms')}
        </Meta>
      </Pressable>
      <Meta variant="note" tone={tone} sentence>
        ·
      </Meta>
      <Pressable accessibilityRole="link" onPress={openPrivacy} hitSlop={8}>
        <Meta variant="note" tone={tone} sentence style={styles.link}>
          {t('legal.privacy')}
        </Meta>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  link: { textDecorationLine: 'underline' },
});
