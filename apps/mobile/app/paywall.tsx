import { SINGLE_PHOTO_PRICE_LABEL, WEEKLY_CREDITS } from '@loxa/shared';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { syncPurchases } from '@/api/client';
import { LegalLinks } from '@/components/LegalLinks';
import { ResultWall } from '@/components/ResultWall';
import { Body, Display, Meta } from '@/components/Text';
import { purchases, useWeeklyPricing } from '@/purchases';
import { useCredits } from '@/store/credits';
import { color, motion, radius, space } from '@/theme';

/**
 * The sheet that comes up when the credits are gone.
 *
 * Two options and a way out. The $0.99 photo is listed first and outlined
 * rather than filled: it is the smaller commitment, and burying it under the
 * subscription would make the cheaper choice feel like the hidden one.
 *
 * The weekly's introductory first week is deliberately *not* shown here. Whoever
 * is reading this sheet has run out of credits, so they either already hold the
 * subscription or already declined the offer — and a second $0.99 beside the
 * $0.99 photo would read as one price attached to two different things.
 *
 * Nothing here grants a credit. A purchase produces transaction ids, the Worker
 * checks them with the store, and the balance that comes back is the truth.
 */
export default function Paywall() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { refresh } = useCredits();
  const { price } = useWeeklyPricing();
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
      {/*
        The same wall as the onboarding offer, on stills. This used to be a
        scrim over whatever screen the sheet had covered, which on the way out
        of the profile is a flat grey rectangle — an empty half-screen above a
        price is the least persuasive thing on it. The wall is what the money
        buys, so it is the right thing to be looking at while deciding.

        Under the scrim, not instead of it: the sheet is paper and has to stay
        the brightest object here, and twelve photographs at full strength
        would be competing with the two prices for the eye.

        It starts at the status bar rather than above the screen: what shows
        here is a band, not a full screen, so the offer's head start would push
        the first row of faces out of sight.
      */}
      <ResultWall clips={false} top={insets.top} />
      <View style={[StyleSheet.absoluteFill, styles.scrim]} pointerEvents="none" />

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
              {price}
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
  // Paper rather than see-through. A transparent modal over the screen behind
  // is what the scrim alone was for; with a wall in it, the gaps between the
  // tiles would show that screen through the drift.
  screen: { flex: 1, backgroundColor: color.paper, justifyContent: 'flex-end', overflow: 'hidden' },
  scrim: { backgroundColor: color.scrim },
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
