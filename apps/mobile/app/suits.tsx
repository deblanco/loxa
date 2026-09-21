import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyseFace, ApiRequestError } from '@/api/client';
import { Chevron } from '@/components/Chevron';
import { PhotoPlate } from '@/components/PhotoPlate';
import { Pill } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { SuitsSeal } from '@/components/SuitsSeal';
import { Body, Display, Meta } from '@/components/Text';
import { reportHandled } from '@/diagnostics';
import { faceShapeKey } from '@/face/shape';
import { verdictLine, type FaceVerdict } from '@/face/verdict';
import { pickFromLibrary } from '@/photo';
import { readAnalysis, saveAnalysis, type StoredAnalysis } from '@/store/analysis';
import { useCatalogue } from '@/store/catalogue';
import { useCredits } from '@/store/credits';
import {
  clearSuitsShots,
  putSuitsShot,
  suitsPhotos,
  suitsShots,
  type SuitsSlot,
} from '@/store/suits-shots';
import { findStyle } from '@/catalogue';
import { color, radius, space } from '@/theme';

/**
 * Which cuts suit this face.
 *
 * The one screen in the app that asks a question rather than answering one, and
 * the only place a photograph is sent anywhere except to be restyled. A model
 * reads one photo — two if the user offers a second angle — and names the cuts
 * from our catalogue that suit the face, with a sentence each.
 *
 * **It needs a credit and spends none.** The Worker refuses a device with
 * nothing in the pot, which arrives here as the paywall; every answer after
 * that is included. The copy says "included with any credit" and never says
 * free, because the difference matters to somebody at zero.
 *
 * The photographs are dropped once the answer lands — the holder is memory
 * only, and the Worker does not keep them either. What is kept is the verdict.
 */
/** Measured end to end through the Worker, with the catalogue in the prompt. */
const ANALYSIS_ESTIMATE_MS = 13_000;

export default function Suits() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { credits } = useCredits();
  const { catalogue } = useCatalogue();

  // Re-read on focus rather than held: the camera is pushed from here and
  // fills the holder on its way back, which is the only moment this screen can
  // learn it has a photo.
  const [shots, setShots] = useState(suitsShots());
  const [answer, setAnswer] = useState<StoredAnalysis | null>(null);
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);
  // Why the last photo was turned away, if it was. The camera screen says this
  // in place of its hint; here it belongs under the slot that refused.
  const [rejected, setRejected] = useState<FaceVerdict | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * The bar, while the model reads.
   *
   * Asymptotic and never finished, exactly as the generating screen does it:
   * the answer takes ten seconds and more against the primary provider, and a
   * bar that fills and then waits is a worse lie than one that slows down.
   */
  useEffect(() => {
    if (!asking) return;
    const started = Date.now();
    const timer = setInterval(() => {
      setProgress(Math.min(0.95, (Date.now() - started) / ANALYSIS_ESTIMATE_MS));
    }, 100);
    return () => clearInterval(timer);
  }, [asking]);

  useFocusEffect(
    useCallback(() => {
      setShots(suitsShots());
      void readAnalysis().then((stored) => {
        // Only as the opening state. An answer already on screen is this
        // session's, and re-reading would replace it with itself.
        setAnswer((current) => current ?? stored);
      });
    }, []),
  );

  async function fromLibrary(slot: SuitsSlot) {
    const result = await pickFromLibrary();
    // Null is the user backing out, which is neither a failure nor a verdict.
    if (!result) return;

    // A photo with no face in it, or two faces, is a thing to say out loud.
    // Dropping it silently leaves somebody tapping a slot that never fills.
    if (!result.ok) {
      setRejected(result.reason);
      return;
    }

    setRejected(null);
    putSuitsShot(slot, result.photo);
    setShots(suitsShots());
  }

  async function ask() {
    const photos = suitsPhotos();
    if (photos.length === 0) return;

    // The same gate the confirm screen uses, and for the same reason: null is
    // still loading and goes through, because guessing "no" puts a paywall in
    // front of somebody who has paid.
    const left = credits?.creditsLeft ?? null;
    if (left !== null && left < 1) {
      router.push('/paywall');
      return;
    }

    setAsking(true);
    setFailed(false);
    setProgress(0);
    try {
      const result = await analyseFace(photos);
      const stored = { faceShape: result.faceShape, cuts: result.cuts, at: new Date().toISOString() };
      setAnswer(stored);
      await saveAnalysis(result);
      // The photographs have done their work. Nothing here keeps them, and
      // neither does the Worker.
      clearSuitsShots();
      setShots(suitsShots());
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'out_of_credits') {
        router.push('/paywall');
      } else {
        reportHandled(err, 'suits.analyse');
        setFailed(true);
      }
    } finally {
      setAsking(false);
    }
  }

  /** Straight to the confirm screen, on the cut that was suggested. */
  function tryOn(styleId: string) {
    const style = catalogue ? findStyle(catalogue, styleId) : undefined;
    const colorId = style?.colors[0]?.id ?? catalogue?.defaults.colorId;
    if (!colorId) return;

    // `source` unset means the saved photo, which is what the confirm screen
    // reads when it was not handed one. The analysis photos are gone by now,
    // deliberately: they were sent to be read, not to be rendered.
    router.push({ pathname: '/confirm', params: { styleId, colorId } });
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.s4 }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          style={styles.round}
        >
          <Chevron />
        </Pressable>
        <Meta>{t('suits.title')}</Meta>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.s10 }]}
        showsVerticalScrollIndicator={false}
      >
        {asking ? (
          <View style={styles.working}>
            <Display variant="displayM">{t('suits.working')}</Display>
            <Display variant="displayM" italic>
              {t('suits.workingItalic')}
            </Display>
            {/* The wait is ten seconds and more. The generating screen makes
                the same promise with the same bar, and a spinner that says
                nothing is how a slow answer reads as a broken one. */}
            <View style={styles.bar}>
              <ProgressBar progress={progress} />
            </View>
          </View>
        ) : answer ? (
          <Answer answer={answer} onAgain={() => setAnswer(null)} onTryOn={tryOn} />
        ) : (
          <>
            <View style={styles.lead}>
              <Display variant="displayM">{t('suits.headline')}</Display>
              <Display variant="displayM" italic>
                {t('suits.headlineItalic')}
              </Display>
              <Body tone="ink55" style={styles.note}>
                {t('suits.note')}
              </Body>
            </View>

            <View style={styles.slots}>
              {([0, 1] as SuitsSlot[]).map((slot) => (
                <Slot
                  key={slot}
                  uri={shots[slot]?.uri}
                  label={t(slot === 0 ? 'suits.slotFront' : 'suits.slotAngle')}
                  onTake={() => router.push(`/camera?from=suits&slot=${slot}`)}
                  onChoose={() => void fromLibrary(slot)}
                />
              ))}
            </View>

            {rejected ? (
              <Meta variant="note" tone="ink55" sentence style={styles.failed}>
                {t(verdictLine(rejected))}
              </Meta>
            ) : null}

            {failed ? (
              <Meta variant="note" tone="ink55" sentence style={styles.failed}>
                {t('suits.failed')}
              </Meta>
            ) : null}

          </>
        )}
      </ScrollView>

      {/*
        Ask sits on the floor rather than under the slots. It is the one thing
        this screen is for, and a primary control that scrolls away with the
        content is a control somebody has to go looking for — the two slots and
        a verdict are both taller than a phone.
      */}
      {answer || asking ? null : (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.s6 }]}>
          <Pill
            label={t('suits.go')}
            // Off the state rather than off the holder: the holder is a module
            // variable and does not re-render anything when it fills.
            disabled={!shots.some(Boolean)}
            onPress={() => void ask()}
          />
          <Meta variant="note" tone="ink40" sentence style={styles.included}>
            {t('suits.included')}
          </Meta>
        </View>
      )}
    </View>
  );
}

/** One photo slot: empty and inviting, or filled and replaceable. */
function Slot({
  uri,
  label,
  onTake,
  onChoose,
}: {
  uri?: string;
  label: string;
  onTake: () => void;
  onChoose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.slot}>
      <PhotoPlate uri={uri} style={styles.slotPlate} />
      <View style={styles.slotText}>
        <Body variant="bodySmall">{label}</Body>
        {/* Buttons, not mono captions. Getting a photo into the slot is the
            only thing this row does, and as text the two ways to do it were
            indistinguishable from the label above them. */}
        <View style={styles.slotActions}>
          {/* Filled, like the welcome step's: taking the photo is the action
              this row exists for, and the library is the alternative to it. */}
          <Pill
            label={uri ? t('suits.replace') : t('suits.take')}
            onPress={onTake}
            style={styles.slotButton}
          />
          <Pill
            label={t('suits.choose')}
            tone="quiet"
            onPress={onChoose}
            style={styles.slotButton}
          />
        </View>
      </View>
    </View>
  );
}

/** The verdict: a shape, then the cuts it suits, in the order they were ranked. */
function Answer({
  answer,
  onAgain,
  onTryOn,
}: {
  answer: StoredAnalysis;
  onAgain: () => void;
  onTryOn: (styleId: string) => void;
}) {
  const { t } = useTranslation();
  const { catalogue } = useCatalogue();

  return (
    <>
      <View style={styles.lead}>
        <Display variant="displayM">{t(faceShapeKey(answer.faceShape))}</Display>
        <Meta variant="note" tone="ink45" sentence style={styles.note}>
          {t('suits.resultNote')}
        </Meta>
      </View>

      <View style={styles.cuts}>
        {answer.cuts.map((cut) => {
          // Named by the model, checked against what this phone can draw: a
          // manifest is a served subset and a cut can be withdrawn.
          const style = catalogue ? findStyle(catalogue, cut.styleId) : undefined;
          if (!style) return null;

          return (
            <View key={cut.styleId} style={styles.cut}>
              <View style={styles.cutHead}>
                <SuitsSeal />
                <Body weight="medium" style={styles.cutName}>
                  {style.name}
                </Body>
                <Pill
                  label={t('suits.tryOn')}
                  tone="quiet"
                  onPress={() => onTryOn(cut.styleId)}
                  style={styles.tryOn}
                />
              </View>
              {/* Model prose. Rendered as text and never as markup — the
                  Worker caps and cleans it, and this is the other half. */}
              <Body variant="bodySmall" tone="ink55">
                {cut.reason}
              </Body>
            </View>
          );
        })}
      </View>

      <Pill label={t('suits.again')} tone="quiet" onPress={onAgain} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  header: {
    paddingHorizontal: space.gutterTextWide,
    paddingBottom: space.s4,
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
  body: { paddingHorizontal: space.gutterHero, gap: space.s5 },
  lead: { gap: space.s1 },
  note: { marginTop: space.s3 },
  slots: { gap: space.s4 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  slotPlate: { width: 72, height: 96, borderRadius: radius.tile },
  slotText: { flex: 1, gap: space.s2 },
  slotActions: { flexDirection: 'row', gap: space.s2 },
  // Short and side by side: two full-height pills per slot, twice over, would
  // be four of them above the fold.
  slotButton: { flex: 1, height: 38, paddingHorizontal: space.s3 },
  tryOn: { height: 34, paddingHorizontal: space.s3 },
  working: { gap: space.s1, paddingTop: space.s10 },
  bar: { marginTop: space.s6 },
  cuts: { gap: space.s4 },
  cut: { gap: space.s2 },
  cutHead: { flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  cutName: { flex: 1 },
  failed: { textAlign: 'center' },
  included: { textAlign: 'center' },
  footer: { paddingHorizontal: space.gutterHero, paddingTop: space.s4, gap: space.s3 },
});
