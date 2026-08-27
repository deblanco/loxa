import { findColor, findStyle } from '@loxa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiRequestError, tryOn } from '@/api/client';
import { PhotoPlate } from '@/components/PhotoPlate';
import { Pill } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { Body, Display, Meta } from '@/components/Text';
import { saveLook } from '@/store/results';
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
const STEPS = ['reading your photo', 'mapping hairline', 'painting colour', 'matching light'] as const;

/** Roughly the render time this model has been measured at, with headroom. */
const ESTIMATE_MS = 9_000;

export default function Generating() {
  const insets = useSafeAreaInsets();
  const { base64, styleId, colorId } = useLocalSearchParams<{
    base64: string;
    styleId: string;
    colorId: string;
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
        const look = await saveLook({ imageBase64: result.imageBase64, styleId, colorId });
        if (cancelled) return;

        setProgress(1);
        router.replace({ pathname: '/result/[id]', params: { id: look.id } });
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

  const step = STEPS[Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length))];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.s4 }]}>
      <PhotoPlate style={styles.plate}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.veil, { opacity: shimmer }]} />
        <View style={styles.centre}>
          <Display variant="displayXs">Generating your look</Display>
          <Meta variant="note" tone="ink45" sentence>
            {step}
          </Meta>
          <View style={styles.bar}>
            <ProgressBar progress={progress} />
          </View>
        </View>
      </PhotoPlate>

      <View style={styles.summary}>
        <Meta tone="ink40" style={styles.summaryHeader}>
          Selection summary
        </Meta>
        <Row label="Style" value={findStyle(styleId)?.name ?? styleId} />
        <Row label="Colour" value={findColor(colorId)?.name ?? colorId} />
        <Row label="Cost" value="1 credit" />
      </View>

      <View style={[styles.cancel, { paddingBottom: insets.bottom + space.s3 }]}>
        <Pill label="Cancel" tone="quiet" onPress={() => router.replace('/preview')} />
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
