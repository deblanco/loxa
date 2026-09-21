import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chevron } from '@/components/Chevron';
import { FaceDiagram } from '@/components/FaceDiagram';
import { NotificationSpecimen } from '@/components/NotificationSpecimen';
import { SuitsSpecimen } from '@/components/SuitsSpecimen';
import { StyleReel } from '@/components/StyleReel';
import { PersonMark } from '@/components/PersonMark';
import { PhotoPlate } from '@/components/PhotoPlate';
import { Pill } from '@/components/Pill';
import { Body, Display, Meta } from '@/components/Text';
import { reportHandled } from '@/diagnostics';
import { pickFromLibrary } from '@/photo';
import { verdictLine, type FaceVerdict } from '@/face/verdict';
import { enableDaily } from '@/notifications';
import { copyForDay } from '@/notifications/copy';
import { formatFireTime, scheduleFrom } from '@/notifications/schedule';
import { useCatalogue } from '@/store/catalogue';
import { useOnboarding } from '@/store/onboarding';
import { readProfilePhoto, saveProfilePhoto } from '@/store/profile-photo';
import { isLastStep, nextStep, previousStep, welcomeCopy, WELCOME_STEPS, type WelcomeStep } from '@/welcome';
import { color, radius, space } from '@/theme';

/**
 * What the app is for, before the app.
 *
 * Four panes on one route rather than four routes, and that is a decision
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
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { complete } = useOnboarding();
  const { catalogue } = useCatalogue();

  const [step, setStep] = useState<WelcomeStep>(WELCOME_STEPS[0]);
  const [portrait, setPortrait] = useState<string | null>(null);
  const [rejected, setRejected] = useState<FaceVerdict | null>(null);
  // Held while iOS has its permission prompt up: the system sheet is modal, but
  // the answer can take a moment to come back, and a second press in that
  // window would ask twice.
  const [asking, setAsking] = useState(false);

  // The first notification they would really get — its line and its minute.
  // Taken once at mount so the sample cannot change while it is being read.
  const first = useMemo(() => scheduleFrom(new Date())[0], []);
  const sample = first ? copyForDay(first.dayIndex) : null;
  const time = first ? formatFireTime(first.fireAt, i18n.language) : '';

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

  /**
   * Ask, then go in — whatever the answer.
   *
   * `enableDaily` raises iOS's own prompt and schedules the week if it is
   * granted. "Don't Allow" is an answer, not an error: onboarding ends either
   * way, and the profile's toggle reads the truth from iOS afterwards. Nothing
   * is asked twice and nothing is persisted here.
   */
  async function turnOn() {
    if (asking) return;
    setAsking(true);
    try {
      await enableDaily();
    } catch (err) {
      reportHandled(err, 'welcome.enableDaily');
    }
    await finish();
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
        {/* The profile's back control, verbatim: a 34pt ringed chevron. Back
            is back everywhere in this app, and a word here where a chevron
            lives two screens later is two vocabularies for one idea. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={back}
          hitSlop={8}
          style={styles.round}
        >
          <Chevron />
        </Pressable>

        <View style={styles.dots}>
          {WELCOME_STEPS.map((each) => (
            <View key={each} style={[styles.dot, each === step && styles.dotOn]} />
          ))}
        </View>

        {/* Balances the back control so the dots sit centred, and carries no
            press: a second way out of a four-step walk is clutter. */}
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <View style={styles.lead}>
          <Display variant="displayM">{t(copy.headline)}</Display>
          <Display variant="displayM" italic>
            {t(copy.headlineItalic)}
          </Display>
        </View>

        {/* The claim above, demonstrated: one cut through three colours, then
            the next cut. The card had a paragraph and then nothing for two
            thirds of a phone. */}
        {step === 'value' ? <StyleReel catalogue={catalogue} /> : null}

        {step === 'photo' ? (
          <View style={styles.portrait}>
            <PhotoPlate uri={portrait} placeholder={<PersonMark />} style={styles.avatar} />
            {/*
              The two ways to get a photo, as buttons, because getting one is
              the whole job of this step. As mono captions they read as labels
              under a picture — the plate above is not pressable and they were
              the only things on the screen that were.

              Stacked rather than side by side: "Choose from library" does not
              fit half a phone in German, and a truncated button is worse than
              a taller column.
            */}
            <View style={styles.portraitActions}>
              {/* Filled, because on this step it is *the* action — the same
                  black pill Try On gets on the screen this leads to. The
                  library is the alternative to it, not its equal. */}
              <Pill
                label={portrait ? t('welcome.change') : t('welcome.take')}
                onPress={() => router.push('/camera?from=profile')}
              />
              <Pill label={t('welcome.choose')} tone="quiet" onPress={() => void fromLibrary()} />
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
            <FaceDiagram size={140} />
            <Meta variant="note" tone="ink45" sentence>
              {t('welcome.privacyNote')}
            </Meta>
          </View>
        ) : null}

        {step === 'notify' && sample ? (
          <View style={styles.diagram}>
            <NotificationSpecimen title={t(sample.title)} body={t(sample.body)} time={time} />
            <Meta variant="note" tone="ink45" sentence>
              {t('welcome.notifyNote')}
            </Meta>
          </View>
        ) : null}

        <Body tone="ink55">{t(copy.body, { time })}</Body>

        {step === 'face' ? <SuitsSpecimen catalogue={catalogue} caption={t('welcome.sealNote')} /> : null}
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + space.s6 }]}>
        {/*
          On the photo step with nothing chosen yet, "Next" and "Skip" would be
          two buttons doing one thing. The footer is the way past instead, and
          it says which it is: skipping while there is nothing to keep, going on
          once there is.
        */}
        {last ? (
          <Pill label={t('welcome.notifyOn')} onPress={() => void turnOn()} disabled={asking} />
        ) : step === 'photo' && !portrait ? null : (
          <Pill label={t('welcome.next')} onPress={forward} />
        )}
        {/*
          A button, not a caption.

          Only where there is something to skip — on the other two steps the
          primary control is already the way on. But where it does appear it
          has to look as pressable as the thing above it: a grey line of mono
          under a black pill reads as a footnote, and a step that *looks*
          mandatory is a photo gate on the second screen of a first run, which
          is the kind of thing 4.3(b) was about.
        */}
        {last ? (
          <Pill label={t('welcome.skip')} tone="quiet" onPress={() => void finish()} disabled={asking} />
        ) : step === 'photo' && !portrait ? (
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
  dots: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: radius.pill, backgroundColor: color.ink18 },
  dotOn: { width: 16, backgroundColor: color.ink },
  body: { flex: 1, paddingHorizontal: space.gutterHero, gap: space.s5 },
  lead: { gap: space.s1 },
  portrait: { alignItems: 'center', gap: space.s3 },
  avatar: { width: 128, height: 128, borderRadius: radius.pill },
  portraitActions: { alignSelf: 'stretch', gap: space.s2 + 2 },
  diagram: { alignItems: 'center', gap: space.s4 },
  actions: { paddingHorizontal: space.gutterHero, gap: space.s4 },
  centred: { textAlign: 'center' },
});
