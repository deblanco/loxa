import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FaceDiagram } from '@/components/FaceDiagram';
import { PersonMark } from '@/components/PersonMark';
import { PhotoPlate } from '@/components/PhotoPlate';
import { Pill } from '@/components/Pill';
import { Body, Display, Meta } from '@/components/Text';
import { reportHandled } from '@/diagnostics';
import { pickFromLibrary } from '@/photo';
import { verdictLine, type FaceVerdict } from '@/face/verdict';
import { useOnboarding } from '@/store/onboarding';
import { readProfilePhoto, saveProfilePhoto } from '@/store/profile-photo';
import { isLastStep, nextStep, previousStep, welcomeCopy, WELCOME_STEPS, type WelcomeStep } from '@/welcome';
import { color, radius, space } from '@/theme';

/**
 * What the app is for, before the app.
 *
 * Three panes on one route rather than three routes, and that is a decision
 * about the flag. The entry screen redirects to preview the instant
 * `loxa.onboarded` turns true, so a flow that wrote it part-way through would
 * teleport somebody out of its own remaining steps. Here it is written once,
 * when the last step is left — and a user who quits half way sees the carousel
 * again, which is the honest reading of "has not been onboarded".
 *
 * One route also keeps the camera simple: the photo step pushes
 * `/camera?from=profile`, whose `router.back()` lands back here because here
 * was pushed too.
 *
 * **Nothing on these screens claims more than the app does.** The phone finds a
 * face and measures its proportions; the measurement stays on the phone; the
 * photo pressed Try On with is the one that leaves. Every sentence is checkable
 * against the privacy page, which is where the same promises are made at
 * length.
 */
export default function Welcome() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { complete } = useOnboarding();

  const [step, setStep] = useState<WelcomeStep>(WELCOME_STEPS[0]);
  const [portrait, setPortrait] = useState<string | null>(null);
  const [rejected, setRejected] = useState<FaceVerdict | null>(null);

  // The camera writes the portrait and comes back; this is the only moment this
  // screen can learn it happened. The same pattern the preview header uses.
  useFocusEffect(
    useCallback(() => {
      void readProfilePhoto().then(setPortrait);
    }, []),
  );

  const copy = welcomeCopy(step);
  const last = isLastStep(step);

  /**
   * Into the app, once and only from the last step.
   *
   * Navigates even if the write throws, exactly as the entry screen used to:
   * the flag failing to flip costs somebody the carousel again next launch,
   * whereas a dead button costs them the app.
   */
  async function finish() {
    try {
      await complete();
    } catch (err) {
      reportHandled(err, 'onboarding.complete');
    }
    // `dismissAll` before the replace, so the stack afterwards is exactly
    // `[preview]` — what it was when the carousel went straight there. Three
    // screens pop back to it (`result`, `offer`, `looks`) with `dismissTo`,
    // and leaving the carousel underneath would put a finished onboarding one
    // back-gesture behind the app. `DevPanel`'s reset does the same thing for
    // the same reason.
    router.dismissAll();
    router.replace('/preview');
  }

  function forward() {
    const next = nextStep(step);
    if (!next) {
      void finish();
      return;
    }
    setStep(next);
  }

  function back() {
    const previous = previousStep(step);
    // Off the first step, back leaves onboarding rather than doing nothing —
    // the carousel is behind this screen, and it is where they came from.
    if (!previous) {
      router.back();
      return;
    }
    setStep(previous);
  }

  async function fromLibrary() {
    const result = await pickFromLibrary();
    if (!result) return;

    // A photo with no face in it is a thing to say, not a tap that does
    // nothing. `photo.ts` has already decided; this only reports it.
    if (!result.ok) {
      setRejected(result.reason);
      return;
    }

    setRejected(null);
    try {
      await saveProfilePhoto(result.photo.base64);
      setPortrait(await readProfilePhoto());
    } catch (err) {
      reportHandled(err, 'welcome.savePortrait');
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.s4 }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('welcome.back')}
          onPress={back}
          hitSlop={space.s3}
        >
          <Meta variant="note" tone="ink45" sentence>
            {t('welcome.back')}
          </Meta>
        </Pressable>

        <View style={styles.dots}>
          {WELCOME_STEPS.map((each) => (
            <View key={each} style={[styles.dot, each === step && styles.dotOn]} />
          ))}
        </View>

        {/* Balances the back control so the dots sit centred, and carries no
            press: a second way out of a three-step walk is clutter. */}
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <View style={styles.lead}>
          <Display variant="displayM">{t(copy.headline)}</Display>
          <Display variant="displayM" italic>
            {t(copy.headlineItalic)}
          </Display>
        </View>

        {step === 'photo' ? (
          <View style={styles.portrait}>
            <PhotoPlate uri={portrait} placeholder={<PersonMark />} style={styles.avatar} />
            <View style={styles.portraitActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/camera?from=profile')}
                hitSlop={space.s2}
              >
                <Meta variant="note" tone="ink" sentence>
                  {portrait ? t('welcome.change') : t('welcome.take')}
                </Meta>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => void fromLibrary()} hitSlop={space.s2}>
                <Meta variant="note" tone="ink45" sentence>
                  {t('welcome.choose')}
                </Meta>
              </Pressable>
            </View>
            {portrait ? (
              <Meta variant="note" tone="ink45" sentence>
                {t('welcome.saved')}
              </Meta>
            ) : null}
            {rejected ? (
              <Meta variant="note" tone="ink55" sentence style={styles.centred}>
                {t(verdictLine(rejected))}
              </Meta>
            ) : null}
          </View>
        ) : null}

        {step === 'face' ? (
          <View style={styles.diagram}>
            <FaceDiagram />
            <Meta variant="note" tone="ink45" sentence>
              {t('welcome.privacyNote')}
            </Meta>
          </View>
        ) : null}

        <Body tone="ink55">{t(copy.body)}</Body>
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + space.s6 }]}>
        <Pill label={last ? t('welcome.done') : t('welcome.next')} onPress={forward} />
        {/*
          A button, not a caption.

          Only where there is something to skip — on the other two steps the
          primary control is already the way on. But where it does appear it
          has to look as pressable as the thing above it: a grey line of mono
          under a black pill reads as a footnote, and a step that *looks*
          mandatory is a photo gate on the second screen of a first run, which
          is the kind of thing 4.3(b) was about.
        */}
        {step === 'photo' && !portrait ? (
          <Pill label={t('welcome.skip')} tone="quiet" onPress={forward} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  header: {
    paddingHorizontal: space.gutterHero,
    paddingBottom: space.s6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: { width: 44 },
  dots: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: radius.pill, backgroundColor: color.ink18 },
  dotOn: { width: 16, backgroundColor: color.ink },
  body: { flex: 1, paddingHorizontal: space.gutterHero, gap: space.s5 },
  lead: { gap: space.s1 },
  portrait: { alignItems: 'center', gap: space.s3 },
  avatar: { width: 128, height: 128, borderRadius: radius.pill },
  portraitActions: { flexDirection: 'row', gap: space.s5 },
  diagram: { alignItems: 'center', gap: space.s4 },
  actions: { paddingHorizontal: space.gutterHero, gap: space.s4 },
  centred: { textAlign: 'center' },
});
