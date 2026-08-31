import { SINGLE_PHOTO_PRICE_LABEL, WEEKLY_CREDITS } from '@loxa/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { syncPurchases } from '@/api/client';
import { Chevron } from '@/components/Chevron';
import { DevPanel } from '@/components/DevPanel';
import { PersonMark } from '@/components/PersonMark';
import { PhotoPlate } from '@/components/PhotoPlate';
import { ProgressBar } from '@/components/ProgressBar';
import { Body, Display, Meta } from '@/components/Text';
import { Toast } from '@/components/Toast';
import { planLabel, resetLabel } from '@/format';
import { currentLanguage } from '@/i18n';
import { LANGUAGE_NAMES } from '@/i18n/languages';
import { openPrivacy, openTerms } from '@/legal';
import { disableDaily, enableDaily } from '@/notifications';
import { purchases, useWeeklyPricing } from '@/purchases';
import { useCredits } from '@/store/credits';
import { readProfilePhoto } from '@/store/profile-photo';
import { openReviewPage, reviewStoreUrl } from '@/store/review';
import { openManageSubscriptions } from '@/store/subscription';
import { color, radius, space } from '@/theme';

/** Fixed for the life of the process — it comes from the bundled app config. */
const storeUrl = reviewStoreUrl();

/**
 * Everything that is not trying on hair.
 *
 * The credit card at the top is the one thing people come here for, so it is
 * the loudest object on the screen: the count set in the display serif, on ink,
 * with the reset spelled out beside it. A number that decides whether you can
 * use the app should not be a caption.
 */
export default function Profile() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { credits, refresh } = useCredits();
  const { price } = useWeeklyPricing();
  const [notify, setNotify] = useState(true);
  const [portrait, setPortrait] = useState<string | null>(null);

  // Re-read on focus rather than once: the camera is pushed from here and
  // writes the portrait on its way back, so the only moment this screen can
  // learn about a new one is when it comes forward again.
  useFocusEffect(
    useCallback(() => {
      void readProfilePhoto().then(setPortrait);
    }, []),
  );
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 1600);
  }

  async function toggleNotifications() {
    if (notify) {
      await disableDaily();
      setNotify(false);
      return;
    }
    // Permission may be declined, in which case the toggle must not claim to
    // have turned anything on.
    setNotify(await enableDaily());
  }

  async function restore() {
    const transactionIds = await purchases().restore();
    if (transactionIds.length) await syncPurchases(transactionIds);
    await refresh();
    flash(t('profile.restored'));
  }

  const left = credits?.creditsLeft ?? 0;
  // The denominator is what they hold, not the weekly allowance. `cap` counts
  // only the subscription's pool, but the balance sums three — the lifetime
  // free credit and bought $0.99 credits live outside any week. Reading the cap
  // literally prints "1/0" to a free user holding the credit on the house, and
  // "22/20" to a subscriber who bought two, with a meter to match.
  const cap = Math.max(credits?.cap ?? WEEKLY_CREDITS, left);
  // Trial counts as subscribed: it is an active subscription that renews into
  // a paid one, so Apple's settings is where it is cancelled. Unknown credits
  // read as free, which sends the button to the paywall — the safe way round,
  // since a free user landing on Apple's list finds nothing of ours in it.
  const subscribed = credits?.plan === 'weekly' || credits?.plan === 'trial';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.s4, paddingBottom: space.s10 }}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
            style={styles.round}
          >
            <Chevron />
          </Pressable>
          <Meta>{t('profile.title')}</Meta>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.identity}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(portrait ? 'profile.changePhoto' : 'profile.addPhoto')}
            onPress={() => router.push('/camera?from=profile')}
          >
            <PhotoPlate
              uri={portrait}
              placeholder={<PersonMark />}
              style={styles.avatar}
            />
            <View style={styles.avatarBadge}>
              <Body variant="bodySmall" tone="paper">
                ＋
              </Body>
            </View>
          </Pressable>
          <Meta variant="note" tone="ink45" sentence>
            {t(portrait ? 'profile.tapToChangePhoto' : 'profile.tapToAddPhoto')}
          </Meta>
        </View>

        <View style={styles.creditCard}>
          <View style={styles.creditTop}>
            <View>
              <Meta tone="paper50">{t('profile.creditsLeft')}</Meta>
              <View style={styles.count}>
                <Display variant="numeral" tone="paper">
                  {left}
                </Display>
                <Display variant="price" tone="paper50">
                  {' '}
                  / {cap}
                </Display>
              </View>
            </View>
            <View style={styles.resetLines}>
              <Meta variant="note" tone="paper50" sentence style={styles.right}>
                {t(credits ? resetLabel(credits.resetsAt, new Date()) : 'profile.resetsMonday')}
              </Meta>
              <Meta variant="note" tone="paper50" sentence style={styles.right}>
                {t('profile.noRollOver')}
              </Meta>
            </View>
          </View>
          <View style={styles.meter}>
            <ProgressBar progress={cap === 0 ? 0 : left / cap} onNight />
          </View>
        </View>

        <View style={styles.group}>
          <View style={styles.groupRow}>
            <View style={styles.rowText}>
              <Body weight="medium">{t(planLabel(credits?.plan ?? 'free'))}</Body>
              <Body variant="caption" tone="ink55" style={styles.rowNote}>
                {credits?.plan === 'free'
                  ? t('profile.planFreeNote', { price: SINGLE_PHOTO_PRICE_LABEL })
                  : t('profile.planWeeklyNote', {
                      // The store's own number, so a subscriber in Berlin reads
                      // what their card was charged. `perWeek` is the paywall's
                      // key rather than a second copy of the same abbreviation.
                      price: `${price}${t('paywall.perWeek')}`,
                      count: WEEKLY_CREDITS,
                    })}
              </Body>
            </View>
            {/*
              One button, two destinations, because "manage" means opposite
              things on either side of a subscription. A free user is being
              offered one, so it opens our paywall; a subscriber already has
              one, and the only place it can be cancelled or changed is
              Apple's. Sending a subscriber to the paywall would be a Manage
              button that cannot unsubscribe — the single thing anybody presses
              it for, and a 3.1.2 rejection.
            */}
            <Pressable
              accessibilityRole="button"
              onPress={() => (subscribed ? openManageSubscriptions() : router.push('/paywall'))}
              style={styles.manage}
            >
              <Body variant="caption" tone="paper">
                {t(subscribed ? 'profile.manage' : 'profile.subscribe')}
              </Body>
            </Pressable>
          </View>

          <View style={[styles.groupRow, styles.divided]}>
            <View style={styles.rowText}>
              <Body>{t('profile.notifications')}</Body>
              <Body variant="caption" tone="ink55" style={styles.rowNote}>
                {t('profile.notificationsNote')}
              </Body>
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: notify }}
              onPress={toggleNotifications}
              style={[styles.toggle, notify ? styles.toggleOn : styles.toggleOff]}
            >
              <View style={styles.knob} />
            </Pressable>
          </View>
        </View>

        <View style={styles.rows}>
          {/* The language sits above the legal pages and below the account
              ones, because it is the row somebody hunts for when the rest of
              the screen is in a language they cannot read — and a value beside
              the label is what makes it findable without reading it. */}
          <Row
            label={t('profile.language')}
            value={LANGUAGE_NAMES[currentLanguage()]}
            onPress={() => router.push('/language')}
          />
          <Row label={t('profile.restore')} onPress={restore} />
          {/* Absent until the app has an App Store id to point at — a settings
              row that opens a 404 is worse than no row. The automatic prompt on
              the result screen does not depend on this. */}
          {storeUrl ? <Row label={t('profile.rate')} onPress={openReviewPage} /> : null}
          <Row label={t('profile.privacy')} onPress={openPrivacy} />
          <Row label={t('profile.terms')} onPress={openTerms} last />
        </View>
        {/* Last on the screen, below the real settings, so it reads as a tool
            rather than as a feature. Returns null outside __DEV__. */}
        <DevPanel onChanged={refresh} />
      </ScrollView>

      <Toast message={toast} />
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
  last,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.link, !last && styles.divided]}
    >
      <Body>{label}</Body>
      <View style={styles.linkRight}>
        {value ? (
          <Body variant="caption" tone="ink55">
            {value}
          </Body>
        ) : null}
        <Body variant="bodySmall" tone="ink30">
          ›
        </Body>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  header: {
    paddingHorizontal: space.gutterTextWide,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Balances the back button so `space-between` centres the title. It takes
  // the round's footprint and none of its border: an outlined empty circle
  // opposite a real control reads as a button that does nothing.
  headerSpacer: { width: 34, height: 34 },
  round: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.ink12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { alignItems: 'center', gap: space.s3, paddingTop: space.s6 },
  avatar: { width: 104, height: 104, borderRadius: radius.pill },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    borderWidth: 2.5,
    borderColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditCard: {
    margin: space.gutterScreen,
    marginTop: space.s6,
    padding: space.gutterText,
    borderRadius: radius.card,
    backgroundColor: color.ink,
  },
  creditTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  count: { flexDirection: 'row', alignItems: 'baseline', marginTop: space.s1 },
  resetLines: { alignItems: 'flex-end' },
  right: { textAlign: 'right' },
  meter: { marginTop: space.s3 + 2 },
  group: {
    marginHorizontal: space.gutterScreen,
    borderRadius: radius.card,
    backgroundColor: color.surfaceSunken,
    borderWidth: 1,
    borderColor: color.ink09,
    overflow: 'hidden',
  },
  groupRow: {
    padding: space.gutterText,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s3,
  },
  divided: { borderTopWidth: 1, borderTopColor: color.ink07 },
  rowText: { flex: 1 },
  rowNote: { marginTop: 2 },
  manage: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    justifyContent: 'center',
  },
  toggle: {
    width: 46,
    height: 27,
    borderRadius: radius.pill,
    padding: 3,
    flexDirection: 'row',
  },
  toggleOn: { backgroundColor: color.ink, justifyContent: 'flex-end' },
  toggleOff: { backgroundColor: color.ink18, justifyContent: 'flex-start' },
  knob: { width: 21, height: 21, borderRadius: radius.pill, backgroundColor: color.paper },
  rows: {
    margin: space.gutterScreen,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.ink09,
    overflow: 'hidden',
  },
  link: {
    padding: space.gutterText,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkRight: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
});
