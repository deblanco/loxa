import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiRequestError, tryOn } from '@/api/client';
import { PhotoPlate } from '@/components/PhotoPlate';
import { Pill } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { Body, Display, Meta } from '@/components/Text';
import { humaniseId } from '@/store/look-record';
import { saveLook } from '@/store/results';
import { noteRender } from '@/store/review';
import { color, motion, radius, space } from '@/theme';

/**
 * The wait.
 *
 * The bar is honest about being an estimate rather than a measurement — there
 * is no progress to report from a single synchronous model call, and pretending
 * otherwise with a bar that sticks at 90% is worse than a bar that simply
 * moves. It eases toward 95% and the answer finishes it.
 *
 * The selection summary underneath is the receipt: what was asked for, and what
 * it cost, visible while it is being spent.
 */
const STEPS = [
  'generating.step1',
  'generating.step2',
  'generating.step3',
  'generating.step4',
] as const;

/** Roughly the render time this model has been measured at, with headroom. */
const ESTIMATE_MS = 9_000;

export default function Generating() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // The names come with the render rather than from the catalogue. A render
  // already in flight must not wait on a manifest to print its own caption, and
  // this screen then needs no catalogue at all.
  //
  // `sourceUri` is only in transit: nothing on this screen reads it, and it is
  // deliberately not a render dependency — it is the result screen's copy of
  // the photograph that went in.
  const { base64, sourceUri, styleId, colorId, styleName, colorName } = useLocalSearchParams<{
    base64: string;
    sourceUri?: string;
    styleId: string;
    colorId: string;
    styleName?: string;
    colorName?: string;
  }>();

  const [progress, setProgress] = useState(0);
  const shimmer = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.9, duration: motion.shimmer / 2, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.35, duration: motion.shimmer / 2, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      // Asymptotic, so it never reaches the end on its own and never has to be
      // yanked backwards.
      setProgress(Math.min(0.95, (Date.now() - started) / ESTIMATE_MS));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const result = await tryOn({ imageBase64: base64, styleId, colorId });
        const look = await saveLook({
          imageBase64: result.imageBase64,
          styleId,
          colorId,
          styleName,
          colorName,
        });

        // Before the cancel guard: a render that was billed and written is a
        // render, whether or not this screen is still the one on top. This is
        // also the only place where a look is genuinely new — counting on the
        // result screen would count it again every time it was reopened.
        void noteRender();

        if (cancelled) return;

        setProgress(1);
        router.replace({ pathname: '/result/[id]', params: { id: look.id, sourceUri } });
      } catch (err) {
        if (cancelled) return;

        // Out of credits is the one failure with somewhere to go. Everything
        // else lands back on preview — the credit was refunded server-side, so
        // there is nothing to undo here.
        if (err instanceof ApiRequestError && err.code === 'out_of_credits') {
          router.replace('/paywall');
          return;
        }
        router.replace('/preview');
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [base64, styleId, colorId]);

  const step = STEPS[Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length))] ?? STEPS[0];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.s4 }]}>
      <PhotoPlate style={styles.plate}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.veil, { opacity: shimmer }]} />
        <View style={styles.centre}>
          <Display variant="displayXs">{t('generating.title')}</Display>
          <Meta variant="note" tone="ink45" sentence>
            {t(step)}
          </Meta>
          <View style={styles.bar}>
            <ProgressBar progress={progress} />
          </View>
        </View>
      </PhotoPlate>

      <View style={styles.summary}>
        <Meta tone="ink40" style={styles.summaryHeader}>
          {t('generating.summary')}
        </Meta>
        <Row label={t('generating.style')} value={styleName ?? humaniseId(styleId)} />
        <Row label={t('generating.colour')} value={colorName ?? humaniseId(colorId)} />
        <Row label={t('generating.cost')} value={t('generating.oneCredit')} />
      </View>

      <View style={[styles.cancel, { paddingBottom: insets.bottom + space.s3 }]}>
        <Pill label={t('common.cancel')} tone="quiet" onPress={() => router.replace('/preview')} />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Body tone="ink55">{label}</Body>
      <Body weight="medium">{value}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  plate: { flex: 1, marginHorizontal: space.gutterScreen },
  veil: { backgroundColor: 'rgba(250,248,245,0.45)' },
  centre: { alignItems: 'center', gap: space.s3 + 2 },
  bar: { width: 180 },
  summary: {
    margin: space.gutterScreen,
    padding: space.gutterText,
    borderRadius: radius.card,
    backgroundColor: color.surfaceSunken,
    borderWidth: 1,
    borderColor: color.ink09,
  },
  summaryHeader: { marginBottom: space.s3 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: color.ink07,
  },
  cancel: { paddingHorizontal: space.gutterScreen },
});
