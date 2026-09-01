import { WEEKLY_CREDITS } from '@loxa/shared';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { syncPurchases } from '@/api/client';
import { LegalLinks } from '@/components/LegalLinks';
import { PurchaseSettling } from '@/components/PurchaseSettling';
import { ResultWall } from '@/components/ResultWall';
import { Body, Display, Meta } from '@/components/Text';
import { reportHandled } from '@/diagnostics';
import { paywallResetLabel } from '@/format';
import { purchases, restoreAndSync, usePricing } from '@/purchases';
import { useCredits } from '@/store/credits';
import { color, motion, radius, space } from '@/theme';

/**
 * The sheet that comes up when the credits are gone.
 *
 * Two options and a way out. The $0.99 photo is listed first and outlined
 * rather than filled: it is the smaller commitment, and burying it under the
 * subscription would make the cheaper choice feel like the hidden one.
 *
 * The weekly's introductory first week *is* shown here when the reader is
 * actually eligible for it. It used to be suppressed, on the reasoning that
 * whoever reads this sheet has already seen the offer once. But suppressing the
 * price did not suppress the offer: the App Store still applies it, so an
 * eligible reader was shown $9.99/wk and then charged $0.99. Under-disclosing a
 * price is the same problem as over-disclosing one, pointed the other way.
 *
 * `usePricing` only reports `introPrice` when RevenueCat says this customer is
 * definitely eligible, so the ambiguity that motivated hiding it is gone.
 *
 * Nothing here grants a credit. A purchase produces transaction ids, the Worker
 * checks them with the store, and the balance that comes back is the truth.
 */
export default function Paywall() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { credits, refresh } = useCredits();
  const { price, introPrice, singlePhoto } = usePricing();
  const [restoring, setRestoring] = useState(false);
  // The window between the App Store sheet closing and the balance moving. Both
  // buy paths hold it, because both have one: the photo waits on our Worker
  // confirming the transaction, the subscription on the entitlement it reads.
  const [settling, setSettling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rise, {
      toValue: 1,
      duration: motion.sheet,
      useNativeDriver: true,
    }).start();
  }, [rise]);

  // Both buy paths were unguarded: a throw from the store, or a `syncPurchases`
  // that could not reach the Worker, was an unhandled rejection and the sheet
  // simply sat there. The user is told the same way a failed restore tells
  // them, and we hear about it — a purchase that took money and did not land a
  // credit is the one failure worth hearing about immediately.
  async function buySingle() {
    try {
      const transactionIds = await purchases().buySinglePhoto();
      // Null is a cancelled sheet as well as a product the store would not
      // sell, and neither one has anything to settle.
      if (!transactionIds) return;

      setSettling(true);
      await syncPurchases(transactionIds);
      await refresh();
      router.back();
    } catch (err) {
      reportHandled(err, 'buySinglePhoto');
      setNotice(t('common.restoreFailed'));
    } finally {
      setSettling(false);
    }
  }

  async function restore() {
    setRestoring(true);
    const outcome = await restoreAndSync();
    setRestoring(false);
    await refresh();

    if (outcome === 'restored') {
      router.back();
      return;
    }
    setNotice(t(outcome === 'nothing' ? 'common.restoreNothing' : 'common.restoreFailed'));
  }

  async function buyWeekly() {
    try {
      if (!(await purchases().buyWeekly())) return;

      setSettling(true);
      await refresh();
      router.back();
    } catch (err) {
      reportHandled(err, 'buyWeekly');
      setNotice(t('common.restoreFailed'));
    } finally {
      setSettling(false);
    }
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

      {/* Not dismissible while a purchase settles: a tap out at that moment
          reads as cancelling something Apple has already charged for. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => router.back()}
        disabled={settling}
      />

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
          {/*
            Off the reset the Worker sent, not a fixed "Monday" — on a Sunday
            night the sheet was naming a day that had already arrived.
          */}
          {t(credits ? paywallResetLabel(credits.resetsAt, new Date()) : 'paywall.untilMonday')}
        </Display>

        {settling ? (
          <PurchaseSettling />
        ) : (
          <View style={styles.options}>
            <Pressable accessibilityRole="button" onPress={buySingle} style={styles.option}>
              <View style={styles.optionText}>
                <Body weight="medium">{t('paywall.single')}</Body>
                <Body variant="caption" tone="ink55" style={styles.note}>
                  {t('paywall.singleNote')}
                </Body>
              </View>
              <Display variant="price">{singlePhoto}</Display>
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
        )}

        {/*
          The renewal terms belong on this sheet too. It is a point of purchase
          like the onboarding offer, and it carried a price and a period but
          never said the thing renews.
        */}
        <Meta variant="note" tone="ink40" sentence style={styles.terms}>
          {introPrice
            ? t('common.subscriptionTermsIntro', { price: introPrice, weekly: price })
            : t('common.subscriptionTerms', { weekly: price })}
        </Meta>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            disabled={settling}
            hitSlop={space.s2}
          >
            <Body tone="ink45">{t('paywall.notNow')}</Body>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={restore}
            disabled={restoring || settling}
            hitSlop={space.s2}
          >
            <Meta variant="note" tone="ink40" sentence>
              {notice ?? t('common.restore')}
            </Meta>
          </Pressable>
        </View>

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
  terms: { marginTop: space.s3 + 2, textAlign: 'center' },
  footer: {
    marginTop: space.s3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.s2 + 2,
  },
});
