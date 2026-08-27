import { WEEKLY_CREDITS, WEEKLY_PRICE_LABEL } from '@loxa/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Pill } from '@/components/Pill';
import { PhotoPlate } from '@/components/PhotoPlate';
import { Body, Display, Meta } from '@/components/Text';
import { purchases } from '@/purchases';
import { useOnboarding } from '@/store/onboarding';
import { color, space } from '@/theme';

/**
 * The paywall you meet before the app.
 *
 * A tilted, drifting wall of other people's results behind a hard offer. Both
 * doors lead to the same next screen — the point of "Continue free" is that
 * somebody who says no still gets to use the thing once, which is what makes
 * the trial an offer rather than a toll.
 */
const PERKS = [
  `${WEEKLY_CREDITS} photos a week, any style or colour`,
  'Your own face — not a stock model',
  'New looks dropped daily',
] as const;

const COLUMNS = [
  { seconds: 26, heights: [150, 190, 120, 170] },
  { seconds: 34, heights: [190, 120, 170, 150] },
  { seconds: 30, heights: [120, 170, 150, 190] },
] as const;

export default function Trial() {
  const { complete } = useOnboarding();

  async function startTrial() {
    // A trial is a purchase as far as the store is concerned, so the entitlement
    // the Worker later reads is the real one — nothing here grants credits.
    await purchases().buyWeekly();
    await complete();
    router.replace('/preview');
  }

  async function continueFree() {
    await complete();
    router.replace('/preview');
  }

  return (
    <View style={styles.screen}>
      <View style={styles.wall}>
        {COLUMNS.map((column) => (
          <DriftColumn key={column.seconds} seconds={column.seconds} heights={column.heights} />
        ))}
      </View>

      <LinearGradient
        colors={['rgba(250,248,245,0.1)', 'rgba(250,248,245,0.62)', 'rgba(250,248,245,0.97)', color.paper]}
        locations={[0, 0.4, 0.62, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.offer}>
        <View style={styles.headline}>
          <Meta>3 days free</Meta>
          <Display variant="displayM">Change your hair</Display>
          <Display variant="displayM">twenty times a week.</Display>
        </View>

        <View style={styles.perks}>
          {PERKS.map((perk) => (
            <View key={perk} style={styles.perk}>
              <View style={styles.bullet} />
              <Body tone="ink72" style={styles.perkText}>
                {perk}
              </Body>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pill label="Enable free trial" onPress={startTrial} />
          <Pill label="Continue free" tone="quiet" onPress={continueFree} />
          {/* The price before the tap, not after it. */}
          <Meta variant="note" tone="ink40" sentence style={styles.terms}>
            then {WEEKLY_PRICE_LABEL} · {WEEKLY_CREDITS} photos a week · cancel anytime
          </Meta>
        </View>
      </View>
    </View>
  );
}

/**
 * One column of the wall, drifting up forever.
 *
 * The tiles are duplicated and the loop travels exactly half the content, so
 * the wrap is invisible — the same trick the CSS `loxa-drift` keyframe uses.
 */
function DriftColumn({ seconds, heights }: { seconds: number; heights: readonly number[] }) {
  const drift = useRef(new Animated.Value(0)).current;
  const total = heights.reduce((sum, h) => sum + h + space.s3, 0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: seconds * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, seconds]);

  return (
    <View style={styles.column}>
      <Animated.View
        style={{
          gap: space.s3,
          transform: [
            { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -total] }) },
          ],
        }}
      >
        {[...heights, ...heights].map((height, i) => (
          <PhotoPlate key={i} style={{ height }} />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper, overflow: 'hidden' },
  wall: {
    position: 'absolute',
    top: -140,
    left: -90,
    right: -90,
    height: 640,
    flexDirection: 'row',
    gap: space.s3,
    transform: [{ rotate: '-13deg' }],
  },
  column: { flex: 1, overflow: 'hidden' },
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
});
