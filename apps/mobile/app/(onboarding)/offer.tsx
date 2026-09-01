import { WEEKLY_CREDITS } from '@loxa/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LegalLinks } from '@/components/LegalLinks';
import { Pill } from '@/components/Pill';
import { ResultWall } from '@/components/ResultWall';
import { Body, Display, Meta } from '@/components/Text';
import { purchases, restoreAndSync, usePricing } from '@/purchases';
import { useOnboarding } from '@/store/onboarding';
import { color, radius, space } from '@/theme';

/**
 * The paywall you meet before the app.
 *
 * A tilted, drifting wall of other people's results behind a hard offer. Both
 * doors lead to the same next screen — the point of the corner ✕ is that
 * somebody who says no still gets to look around, which is what makes this an
 * offer rather than a toll.
 *
 * The offer is the App Store's introductory price: a first week at $0.99, then
 * $9.99 a week. There is no free trial, and a customer gets one introductory
 * offer per subscription, so anybody who has subscribed before reads the plain
 * weekly price here instead — see `usePricing`.
 *
 * Restore is here rather than only on the profile because this screen is a gate
 * in front of the app. A subscriber reinstalling meets it before anything else,
 * and without a restore the only way past their own subscription is to decline
 * it and go looking through Settings.
 */
const PERKS = ['offer.perkCredits', 'offer.perkOwnFace', 'offer.perkDaily'] as const;

export default function Offer() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { complete } = useOnboarding();
  const { price, introPrice } = usePricing();
  const [restoring, setRestoring] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function subscribe() {
    // Nothing here asks for the intro price. The App Store applies it to an
    // eligible buyer on its own, and the entitlement the Worker later reads is
    // the same one either way — an intro week is a paid week.
    await purchases().buyWeekly();
    await complete();
    router.replace('/preview');
  }

  async function restore() {
    setRestoring(true);
    const outcome = await restoreAndSync();
    setRestoring(false);

    // A restore that found a subscription lands in the app; the entitlement is
    // the Worker's to read, and this screen has nothing left to ask for.
    if (outcome === 'restored') {
      await complete();
      router.replace('/preview');
      return;
    }
    setNotice(t(outcome === 'nothing' ? 'common.restoreNothing' : 'common.restoreFailed'));
  }

  async function skip() {
    await complete();
    router.replace('/preview');
  }

  return (
    <View style={styles.screen}>
      <ResultWall />

      <LinearGradient
        colors={['rgba(250,248,245,0.1)', 'rgba(250,248,245,0.62)', 'rgba(250,248,245,0.97)', color.paper]}
        locations={[0, 0.4, 0.62, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('offer.skip')}
        onPress={skip}
        hitSlop={space.s3}
        style={[styles.skip, { top: insets.top + space.s2 }]}
      >
        <Body weight="medium" tone="paper">✕</Body>
      </Pressable>

      <View style={styles.offer}>
        <View style={styles.headline}>
          <Meta>
            {introPrice
              ? t('offer.badgeIntro', { price: introPrice })
              : t('offer.badge', { count: WEEKLY_CREDITS })}
          </Meta>
          <Display variant="displayM">{t('offer.headline')}</Display>
          <Display variant="displayM">{t('offer.headlineSecond')}</Display>
        </View>

        <View style={styles.perks}>
          {PERKS.map((perk) => (
            <View key={perk} style={styles.perk}>
              <View style={styles.bullet} />
              <Body tone="ink72" style={styles.perkText}>
                {t(perk, { count: WEEKLY_CREDITS })}
              </Body>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pill
            label={introPrice ? t('offer.startIntro', { price: introPrice }) : t('offer.start')}
            onPress={subscribe}
          />
          {/*
            Every price and the renewal terms before the tap, not after it.
            App Review asks for the length, the price and the fact that it
            renews, next to the control that starts it.
          */}
          <Meta variant="note" tone="ink40" sentence style={styles.terms}>
            {introPrice
              ? t('common.subscriptionTermsIntro', { price: introPrice, weekly: price })
              : t('common.subscriptionTerms', { weekly: price })}
          </Meta>

          <Pressable
            accessibilityRole="button"
            onPress={restore}
            disabled={restoring}
            hitSlop={space.s2}
            style={styles.restore}
          >
            <Meta variant="note" tone="ink40" sentence>
              {notice ?? t('common.restore')}
            </Meta>
          </Pressable>

          <LegalLinks />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper, overflow: 'hidden' },
  skip: {
    position: 'absolute',
    right: space.s4,
    // A dark disc rather than a tinted one: the wall behind it is photographs,
    // and a ✕ that borrows their colour disappears over pale hair. The sheet's
    // scrim is not enough of it — at 0.45 the disc is a shade over whatever
    // has drifted underneath, and half the wall is pale. This is the only way
    // out of the offer, so it is a control: `--scrim-strong`.
    zIndex: 1,
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: color.scrimStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offer: {
    position: 'absolute',
    left: space.gutterHero,
    right: space.gutterHero,
    bottom: 44,
    gap: space.gutterText,
  },
  headline: { gap: space.s2 + 1 },
  perks: { gap: space.s2 + 2 },
  perk: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 9,
    backgroundColor: color.ink,
    marginTop: 8,
  },
  perkText: { flex: 1 },
  actions: { gap: space.s2 + 2 },
  terms: { textAlign: 'center' },
  restore: { alignSelf: 'center', paddingVertical: space.s2 },
});
