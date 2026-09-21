import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LegalLinks } from '@/components/LegalLinks';
import { Pill } from '@/components/Pill';
import { Body, Display } from '@/components/Text';
import { asConsentKind, consentCopy, type ConsentKind } from '@/consent';
import { answerConsent } from '@/consent-prompt';
import { reportHandled } from '@/diagnostics';
import { grantConsent } from '@/store/consent';
import { color, motion, radius, space } from '@/theme';

/**
 * The question that comes before the first photo leaves the phone.
 *
 * It says three things and nothing else — where the photo goes, what is kept,
 * and what is never sent — because those are the three things a person deciding
 * whether to hand over a photograph of their face is actually asking. They are
 * rows rather than a paragraph so that each can be found again without reading
 * the other two: this is the one screen in the app that is being read as a
 * contract.
 *
 * **Every line is checkable against the privacy page and the Worker.** That is
 * the constraint, not the decoration. If a provider changes, or what is kept
 * changes, this changes with `apps/web/app/privacy-policy/page.tsx` in the same
 * commit — and the `.v1` on the keys in `store/consent.ts` is bumped, so that
 * everybody who agreed to the old wording is asked about the new.
 *
 * A "no" of any kind — the button, the scrim, a swipe — sends nothing and
 * costs nothing. Try On is where it left them, and pressing it asks again.
 *
 * A sheet like the money sheet rather than a full screen, on purpose: it is a
 * question about the thing they just pressed, and taking the whole screen would
 * make it feel like a gate rather than a pause.
 */
export default function Consent() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = asConsentKind(params.kind);

  const rise = useRef(new Animated.Value(0)).current;
  const [saving, setSaving] = useState(false);
  // Whether an answer has gone back to the caller, so that leaving by any other
  // door is reported as a "no" exactly once.
  const answered = useRef(false);

  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: motion.sheet, useNativeDriver: true }).start();
  }, [rise]);

  // Swiped away, or the stack popped from outside: that is a "no", and the
  // caller is waiting on it.
  useEffect(() => {
    return () => {
      if (kind && !answered.current) answerConsent(kind, false);
    };
  }, [kind]);

  // A route with no valid kind has nothing to ask. Not reachable from the app;
  // a hand-typed deep link is the only way here, and it should close, not crash.
  useEffect(() => {
    if (!kind) router.back();
  }, [kind]);
  if (!kind) return null;

  const copy = consentCopy(kind);

  function decline(asked: ConsentKind) {
    answered.current = true;
    answerConsent(asked, false);
    router.back();
  }

  async function agree(asked: ConsentKind) {
    if (saving) return;
    setSaving(true);
    try {
      await grantConsent(asked);
    } catch (err) {
      // Could not be written down, so it is not agreed to: a "yes" that will
      // not be remembered would ask again next time and, worse, could not be
      // shown to have been given.
      reportHandled(err, 'consent.grant');
      setSaving(false);
      return;
    }
    answered.current = true;
    router.back();
    answerConsent(asked, true);
  }

  return (
    <View style={styles.screen}>
      <Pressable
        accessibilityLabel={t('consent.decline')}
        style={StyleSheet.absoluteFill}
        onPress={() => decline(kind)}
      />

      <Animated.View
        accessibilityViewIsModal
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

        <Display variant="displayS">{t(copy.headline)}</Display>
        <Display variant="displayS" italic tone="ink60">
          {t(copy.headlineItalic)}
        </Display>

        <View style={styles.rows}>
          <Row label={t('consent.goesTo')} value={t(copy.goesTo)} />
          <Row label={t('consent.kept')} value={t(copy.kept)} />
          <Row label={t('consent.never')} value={t(copy.never)} />
        </View>

        <View style={styles.actions}>
          <Pill label={t('consent.agree')} onPress={() => void agree(kind)} disabled={saving} />
          <Pill label={t('consent.decline')} tone="quiet" onPress={() => decline(kind)} disabled={saving} />
        </View>

        <LegalLinks />
      </Animated.View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Body variant="caption" tone="ink45" style={styles.label}>
        {label}
      </Body>
      <Body variant="bodySmall" tone="ink80" style={styles.value}>
        {value}
      </Body>
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
  rows: { marginTop: space.s5, borderTopWidth: 1, borderTopColor: color.ink12 },
  row: {
    flexDirection: 'row',
    gap: space.s4,
    paddingVertical: space.s3,
    borderBottomWidth: 1,
    borderBottomColor: color.ink12,
  },
  // A fixed column so the three values start on one line. Wide enough for
  // "Never sent" and its longest translation without wrapping.
  label: { width: 92, paddingTop: 2 },
  value: { flex: 1 },
  actions: { marginTop: space.s5, gap: space.s2 + 2 },
});
