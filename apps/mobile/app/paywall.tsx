import { SINGLE_PHOTO_PRICE_LABEL, WEEKLY_CREDITS, WEEKLY_PRICE_LABEL } from '@loxa/shared';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { syncPurchases } from '@/api/client';
import { LegalLinks } from '@/components/LegalLinks';
import { Body, Display, Meta } from '@/components/Text';
import { purchases } from '@/purchases';
import { useCredits } from '@/store/credits';
import { color, motion, radius, space } from '@/theme';

/**
 * The sheet that comes up when the credits are gone.
 *
 * Two options and a way out. The $0.99 photo is listed first and outlined
 * rather than filled: it is the smaller commitment, and burying it under the
 * subscription would make the cheaper choice feel like the hidden one.
 *
 * Nothing here grants a credit. A purchase produces transaction ids, the Worker
 * checks them with the store, and the balance that comes back is the truth.
 */
export default function Paywall() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { refresh } = useCredits();
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rise, {
      toValue: 1,
      duration: motion.sheet,
      useNativeDriver: true,
    }).start();
  }, [rise]);

  async function buySingle() {
    const transactionIds = await purchases().buySinglePhoto();
    if (!transactionIds) return;

    await syncPurchases(transactionIds);
    await refresh();
    router.back();
  }

  async function buyWeekly() {
    if (!(await purchases().buyWeekly())) return;
    await refresh();
    router.back();
  }

  return (
    <View style={styles.screen}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} />

      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + space.s6 },
          {
            opacity: rise,
            transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
          },
        ]}
      >
        <View style={styles.grabber} />

        <Display variant="displayS">{t('paywall.title')}</Display>
        <Display variant="displayS" italic tone="ink60">
          {t('paywall.titleItalic')}
        </Display>

        <View style={styles.options}>
          <Pressable accessibilityRole="button" onPress={buySingle} style={styles.option}>
            <View style={styles.optionText}>
              <Body weight="medium">{t('paywall.single')}</Body>
              <Body variant="caption" tone="ink55" style={styles.note}>
                {t('paywall.singleNote')}
              </Body>
            </View>
            <Display variant="price">{SINGLE_PHOTO_PRICE_LABEL}</Display>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={buyWeekly}
            style={[styles.option, styles.optionFilled]}
          >
            <View style={styles.optionText}>
              <View style={styles.titleRow}>
                <Body weight="medium" tone="paper">
                  {t('paywall.weekly')}
                </Body>
                <View style={styles.tag}>
                  <Meta variant="metaSmall" tone="paper">
                    {t('paywall.bestValue')}
                  </Meta>
                </View>
              </View>
              <Body variant="caption" tone="paper60" style={styles.note}>
                {t('paywall.weeklyNote', { count: WEEKLY_CREDITS })}
              </Body>
            </View>
            <Display variant="price" tone="paper">
              {WEEKLY_PRICE_LABEL.split('/')[0]}
              {t('paywall.perWeek')}
            </Display>
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.dismiss}>
          <Body tone="ink45">{t('paywall.notNow')}</Body>
        </Pressable>

        <LegalLinks />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: color.paper,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.gutterTextWide,
    paddingTop: space.s5 + 2,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: color.ink18,
    alignSelf: 'center',
    marginBottom: space.gutterText,
  },
  options: { marginTop: space.s4, gap: space.s2 + 2 },
  option: {
    padding: space.s4,
    paddingHorizontal: space.gutterText,
    borderRadius: radius.option,
    borderWidth: 1,
    borderColor: color.ink18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s3,
  },
  optionFilled: { backgroundColor: color.ink, borderColor: color.ink },
  optionText: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(250,248,245,0.18)',
  },
  note: { marginTop: 2 },
  dismiss: { marginTop: space.s3 + 2, alignItems: 'center', padding: space.s2 + 2 },
});
