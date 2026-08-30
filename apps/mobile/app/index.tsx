import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Pill } from '@/components/Pill';
import { VideoPlate } from '@/components/VideoPlate';
import { Body, Display } from '@/components/Text';
import { Wordmark } from '@/components/Wordmark';
import { footageUrls } from '@/api/assets';
import { useOnboarding } from '@/store/onboarding';
import { color, motion, radius, space } from '@/theme';

/**
 * The entry carousel.
 *
 * Three clips of people restyling their hair, crossfading, with the pitch over
 * them. Night, because it is a photograph full-bleed and a photograph needs a
 * dark room.
 *
 * The clips are served from the bucket and bundled in the binary, in that
 * order. Served, because footage is the one thing on this screen most likely to
 * be replaced and a shoot should not need an App Store review to reach anybody.
 * Bundled underneath, because this is the first screen of a fresh install —
 * before onboarding has minted a device id, before anything has been cached —
 * and the one screen in the app that must be right with the radio off.
 *
 * They are trimmed to the reveal, which is what `--interval-carousel` is long
 * enough for and what the pitch is about: each one is a colour and a cut
 * landing on a face that was already there.
 */
const SLIDES = [
  {
    name: 'entry-01-walking',
    bundled: {
      clip: require('../assets/onboarding/entry-01-walking.mp4'),
      poster: require('../assets/onboarding/entry-01-walking.jpg'),
    },
  },
  {
    name: 'entry-02-laughing',
    bundled: {
      clip: require('../assets/onboarding/entry-02-laughing.mp4'),
      poster: require('../assets/onboarding/entry-02-laughing.jpg'),
    },
  },
  {
    name: 'entry-03-mirror',
    bundled: {
      clip: require('../assets/onboarding/entry-03-mirror.mp4'),
      poster: require('../assets/onboarding/entry-03-mirror.jpg'),
    },
  },
] as const;

export default function Entry() {
  const { t } = useTranslation();
  const { onboarded } = useOnboarding();
  const [slide, setSlide] = useState(0);

  // Somebody who has already heard the pitch goes straight to the app. Checked
  // here rather than in the layout so the redirect happens before a frame of
  // carousel is drawn.
  useEffect(() => {
    if (onboarded) router.replace('/preview');
  }, [onboarded]);

  useEffect(() => {
    const timer = setInterval(
      () => setSlide((current) => (current + 1) % SLIDES.length),
      motion.carouselHold,
    );
    return () => clearInterval(timer);
  }, []);

  if (onboarded !== false) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      {SLIDES.map((clip, i) => (
        <Fade key={clip.name} on={i === slide}>
          <VideoPlate
            remote={footageUrls(clip.name)}
            bundled={clip.bundled}
            style={StyleSheet.absoluteFill}
          />
        </Fade>
      ))}

      <LinearGradient
        colors={['rgba(16,14,13,0.55)', 'rgba(16,14,13,0)', 'rgba(16,14,13,0.72)', 'rgba(16,14,13,0.96)']}
        locations={[0, 0.34, 0.68, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Wordmark tone="paper" style={styles.wordmark} />

      <View style={styles.pitch}>
        <View style={styles.headline}>
          <Display variant="displayL" tone="paper">
            {t('entry.headline')}
          </Display>
          <Display variant="displayL" tone="paper" italic style={styles.second}>
            {t('entry.headlineItalic')}
          </Display>
        </View>

        <Body tone="paper66" style={styles.sub}>
          {t('entry.sub')}
        </Body>

        <Pill
          label={t('entry.cta')}
          tone="light"
          onPress={() => router.push('/(onboarding)/trial')}
        />

        <View style={styles.dots}>
          {SLIDES.map((clip, i) => (
            <Pressable
              key={clip.name}
              accessibilityRole="button"
              accessibilityLabel={t('entry.slide', { number: i + 1 })}
              onPress={() => setSlide(i)}
              style={[
                styles.dot,
                i === slide ? styles.dotOn : styles.dotOff,
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * One slide, dissolving in or out over `--duration-fade`.
 *
 * A dissolve rather than a cut because the clips do not share a room: cutting
 * from a pavement at golden hour to a greenhouse is a jump, and the design
 * system spends 1.1s on the join for exactly that reason. Both clips keep
 * playing underneath — a paused frame halfway through a dissolve is a
 * photograph, and the pitch is that the hair moves.
 */
function Fade({ on, children }: { on: boolean; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(on ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: on ? 1 : 0,
      duration: motion.fade,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [on, opacity]);

  return (
    <Animated.View style={[styles.slide, { opacity }]} pointerEvents="none">
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.night },
  slide: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  wordmark: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    justifyContent: 'center',
  },
  pitch: {
    position: 'absolute',
    left: space.gutterHero,
    right: space.gutterHero,
    bottom: 74,
    gap: space.s5 + 2,
  },
  headline: { gap: 0 },
  second: { opacity: 0.82 },
  sub: { maxWidth: '86%' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7 },
  dot: { height: 4, borderRadius: radius.pill },
  dotOn: { width: 22, backgroundColor: color.paper },
  dotOff: { width: 6, backgroundColor: 'rgba(250,248,245,0.35)' },
});
