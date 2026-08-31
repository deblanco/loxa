import { WEEKLY_CREDITS } from '@loxa/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assetUrl, footageUrls } from '@/api/assets';
import { Pill } from '@/components/Pill';
import { PhotoPlate } from '@/components/PhotoPlate';
import { VideoPlate } from '@/components/VideoPlate';
import { LegalLinks } from '@/components/LegalLinks';
import { Body, Display, Meta } from '@/components/Text';
import { purchases, useWeeklyPricing } from '@/purchases';
import { useOnboarding } from '@/store/onboarding';
import { color, radius, space } from '@/theme';

/**
 * The paywall you meet before the app.
 *
 * A tilted, drifting wall of other people's results behind a hard offer. Both
 * doors lead to the same next screen — the point of the corner ✕ is that
 * somebody who says no still gets to look around, which is what makes this an
 * offer rather than a toll.
 *
 * The offer is the App Store's introductory price: a first week at $0.99, then
 * $9.99 a week. There is no free trial, and a customer gets one introductory
 * offer per subscription, so anybody who has subscribed before reads the plain
 * weekly price here instead — see `useWeeklyPricing`.
 */
const PERKS = ['offer.perkCredits', 'offer.perkOwnFace', 'offer.perkDaily'] as const;

/**
 * The wall, as three columns of four.
 *
 * Nine stills and three clips, one clip per column. A dozen players on a
 * paywall would spend the battery of somebody who is reading a price, and the
 * wall is scenery: it is tilted thirteen degrees and half of it is under a
 * gradient. But a wall that does not move at all is a screenshot, and the perk
 * above it claims a hair colour arriving on a face. Three moving tiles are
 * enough to make that claim; the other nine hold the composition still enough
 * to read the price over.
 *
 * One per column, and each on the tallest tile in it, so the moving thing is
 * never two columns of the same drift apart and is always the tile with the
 * most of it showing.
 *
 * A tile is a real render — a different face, cut and colour in each — because
 * the perk above it says twenty photos a week and a hatched rectangle is not
 * evidence of that. The clips are cuts changing on the same woman rather than
 * three separate people, which is the same argument the entry carousel makes.
 *
 * Served from the bucket where there is one, bundled where there is not, on the
 * same terms as the entry clips: the wall is the screen most likely to be
 * re-shot, and the bundled copy is what stands behind the price on a first
 * launch with no network. A clip's poster is its own first frame under its own
 * key, so `wall-02.jpg` is the still of `wall-02.mp4` rather than a twelfth
 * picture — the same both-or-neither rule `footageUrls` enforces.
 */
const COLUMNS = [
  {
    seconds: 26,
    tiles: [
      {
        height: 150,
        name: 'wall-01',
        bundled: require('../../assets/onboarding/wall-01.jpg'),
      },
      {
        height: 190,
        name: 'wall-02',
        bundled: require('../../assets/onboarding/wall-02.jpg'),
        clip: require('../../assets/onboarding/wall-02.mp4'),
      },
      {
        height: 120,
        name: 'wall-03',
        bundled: require('../../assets/onboarding/wall-03.jpg'),
      },
      {
        height: 170,
        name: 'wall-04',
        bundled: require('../../assets/onboarding/wall-04.jpg'),
      },
    ],
  },
  {
    seconds: 34,
    tiles: [
      {
        height: 190,
        name: 'wall-05',
        bundled: require('../../assets/onboarding/wall-05.jpg'),
        clip: require('../../assets/onboarding/wall-05.mp4'),
      },
      {
        height: 120,
        name: 'wall-06',
        bundled: require('../../assets/onboarding/wall-06.jpg'),
      },
      {
        height: 170,
        name: 'wall-07',
        bundled: require('../../assets/onboarding/wall-07.jpg'),
      },
      {
        height: 150,
        name: 'wall-08',
        bundled: require('../../assets/onboarding/wall-08.jpg'),
      },
    ],
  },
  {
    seconds: 30,
    tiles: [
      {
        height: 120,
        name: 'wall-09',
        bundled: require('../../assets/onboarding/wall-09.jpg'),
      },
      {
        height: 170,
        name: 'wall-10',
        bundled: require('../../assets/onboarding/wall-10.jpg'),
      },
      {
        height: 150,
        name: 'wall-11',
        bundled: require('../../assets/onboarding/wall-11.jpg'),
      },
      {
        height: 190,
        name: 'wall-12',
        bundled: require('../../assets/onboarding/wall-12.jpg'),
        clip: require('../../assets/onboarding/wall-12.mp4'),
      },
    ],
  },
] as const;

type Tile = (typeof COLUMNS)[number]['tiles'][number];

export default function Offer() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { complete } = useOnboarding();
  const { price, introPrice } = useWeeklyPricing();

  async function subscribe() {
    // Nothing here asks for the intro price. The App Store applies it to an
    // eligible buyer on its own, and the entitlement the Worker later reads is
    // the same one either way — an intro week is a paid week.
    await purchases().buyWeekly();
    await complete();
    router.replace('/preview');
  }

  async function skip() {
    await complete();
    router.replace('/preview');
  }

  return (
    <View style={styles.screen}>
      <View style={styles.wall}>
        {COLUMNS.map((column) => (
          <DriftColumn key={column.seconds} seconds={column.seconds} tiles={column.tiles} />
        ))}
      </View>

      <LinearGradient
        colors={['rgba(250,248,245,0.1)', 'rgba(250,248,245,0.62)', 'rgba(250,248,245,0.97)', color.paper]}
        locations={[0, 0.4, 0.62, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('offer.skip')}
        onPress={skip}
        hitSlop={space.s3}
        style={[styles.skip, { top: insets.top + space.s2 }]}
      >
        <Body weight="medium" tone="paper">✕</Body>
      </Pressable>

      <View style={styles.offer}>
        <View style={styles.headline}>
          <Meta>
            {introPrice
              ? t('offer.badgeIntro', { price: introPrice })
              : t('offer.badge', { count: WEEKLY_CREDITS })}
          </Meta>
          <Display variant="displayM">{t('offer.headline')}</Display>
          <Display variant="displayM">{t('offer.headlineSecond')}</Display>
        </View>

        <View style={styles.perks}>
          {PERKS.map((perk) => (
            <View key={perk} style={styles.perk}>
              <View style={styles.bullet} />
              <Body tone="ink72" style={styles.perkText}>
                {t(perk, { count: WEEKLY_CREDITS })}
              </Body>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pill
            label={introPrice ? t('offer.startIntro', { price: introPrice }) : t('offer.start')}
            onPress={subscribe}
          />
          {/* Both prices before the tap, not after it. */}
          <Meta variant="note" tone="ink40" sentence style={styles.terms}>
            {introPrice
              ? t('offer.termsIntro', { price: introPrice, weekly: price, count: WEEKLY_CREDITS })
              : t('offer.terms', { weekly: price, count: WEEKLY_CREDITS })}
          </Meta>
          <LegalLinks />
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
 *
 * The duplicate is a second player for a clip tile, so three clips are six
 * players: a `VideoView` renders the player it is given, and two of them
 * sharing one would leave whichever lost the race blank. Six small muted
 * decodes is the price of the seamless wrap; a still standing in for the
 * duplicate would be the same tile freezing every other pass.
 */
function DriftColumn({ seconds, tiles }: { seconds: number; tiles: readonly Tile[] }) {
  const drift = useRef(new Animated.Value(0)).current;
  const total = tiles.reduce((sum, tile) => sum + tile.height + space.s3, 0);

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
        {[...tiles, ...tiles].map((tile, i) =>
          'clip' in tile ? (
            <VideoPlate
              key={i}
              remote={footageUrls(tile.name)}
              bundled={{ clip: tile.clip, poster: tile.bundled }}
              style={[styles.tile, { height: tile.height }]}
            />
          ) : (
            <PhotoPlate
              key={i}
              uri={assetUrl(`onboarding/${tile.name}.jpg`) ?? tile.bundled}
              fallback={tile.bundled}
              style={{ height: tile.height }}
            />
          ),
        )}
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
  // `VideoPlate` is square by default — it is normally full-bleed behind the
  // pitch. On the wall it is a tile beside eleven plates and wears their radius.
  tile: { borderRadius: radius.plate },
  skip: {
    position: 'absolute',
    right: space.s4,
    // A dark disc rather than a tinted one: the wall behind it is photographs,
    // and a ✕ that borrows their colour disappears over pale hair. The sheet's
    // scrim is not enough of it — at 0.45 the disc is a shade over whatever
    // has drifted underneath, and half the wall is pale. This is the only way
    // out of the offer, so it is a control: `--scrim-strong`.
    zIndex: 1,
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: color.scrimStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
