import { WEEKLY_CREDITS, WEEKLY_PRICE_LABEL } from '@loxa/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { syncPurchases } from '@/api/client';
import { PhotoPlate } from '@/components/PhotoPlate';
import { ProgressBar } from '@/components/ProgressBar';
import { Body, Display, Meta } from '@/components/Text';
import { Toast } from '@/components/Toast';
import { planLabel, resetLabel } from '@/format';
import { disableDaily, enableDaily } from '@/notifications';
import { purchases } from '@/purchases';
import { useCredits } from '@/store/credits';
import { color, radius, space } from '@/theme';

/**
 * Everything that is not trying on hair.
 *
 * The credit card at the top is the one thing people come here for, so it is
 * the loudest object on the screen: the count set in the display serif, on ink,
 * with the reset spelled out beside it. A number that decides whether you can
 * use the app should not be a caption.
 */
export default function Profile() {
  const insets = useSafeAreaInsets();
  const { credits, refresh } = useCredits();
  const [notify, setNotify] = useState(true);
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
    flash('Purchases restored');
  }

  const left = credits?.creditsLeft ?? 0;
  const cap = credits?.cap ?? WEEKLY_CREDITS;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.s4, paddingBottom: space.s10 }}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={styles.round}
          >
            <Body>‹</Body>
          </Pressable>
          <Meta>Profile</Meta>
          <View style={styles.round} />
        </View>

        <View style={styles.identity}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change your photo"
            onPress={() => router.push('/camera')}
          >
            <PhotoPlate style={styles.avatar} />
            <View style={styles.avatarBadge}>
              <Body variant="bodySmall" tone="paper">
                ＋
              </Body>
            </View>
          </Pressable>
          <Meta variant="note" tone="ink45" sentence>
            tap to change your photo
          </Meta>
        </View>

        <View style={styles.creditCard}>
          <View style={styles.creditTop}>
            <View>
              <Meta tone="paper50">Credits left</Meta>
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
                {credits ? resetLabel(credits.resetsAt, new Date()) : 'resets Monday'}
              </Meta>
              <Meta variant="note" tone="paper50" sentence style={styles.right}>
                no roll-over
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
              <Body weight="medium">{planLabel(credits?.plan ?? 'free')}</Body>
              <Body variant="caption" tone="ink55" style={styles.rowNote}>
                {credits?.plan === 'free'
                  ? 'No weekly credits — $0.99 per photo'
                  : `${WEEKLY_PRICE_LABEL} · ${WEEKLY_CREDITS} photos a week`}
              </Body>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/paywall')}
              style={styles.manage}
            >
              <Body variant="caption" tone="paper">
                Manage
              </Body>
            </Pressable>
          </View>

          <View style={[styles.groupRow, styles.divided]}>
            <View style={styles.rowText}>
              <Body>Daily style ideas</Body>
              <Body variant="caption" tone="ink55" style={styles.rowNote}>
                One notification a day, new looks
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
          <Row label="Restore purchases" onPress={restore} />
          <Row
            label="Privacy policy"
            onPress={() => Linking.openURL('https://loxa.blankhexadecimal.com/privacy-policy')}
          />
          <Row
            label="Terms of use"
            onPress={() => Linking.openURL('https://loxa.blankhexadecimal.com/terms')}
            last
          />
        </View>
      </ScrollView>

      <Toast message={toast} />
    </View>
  );
}

function Row({ label, onPress, last }: { label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.link, !last && styles.divided]}
    >
      <Body>{label}</Body>
      <Body variant="bodySmall" tone="ink30">
        ›
      </Body>
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
});
