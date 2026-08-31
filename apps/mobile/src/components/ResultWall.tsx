import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { assetUrl, footageUrls } from '../api/assets';
import { radius, space } from '../theme';
import { PhotoPlate } from './PhotoPlate';
import { VideoPlate } from './VideoPlate';

/**
 * The drifting wall of other people's results, behind whatever is asking for
 * money.
 *
 * Shared by the two screens that sell: the onboarding offer, which meets you
 * before the app, and the out-of-credits sheet, which meets you in the middle
 * of using it. It was written for the first and lived inside it; the second had
 * a flat scrim over an empty screen, which is a lot of nothing to read a price
 * over. One wall, so a re-shoot lands on both.
 *
 * `clips` is the difference between them. The offer is seen once, at the start,
 * and can afford six video decodes to prove that a colour arrives on a face.
 * The paywall is seen every time the credits run out, so it takes the twelve
 * stills and none of the players — the drift alone is enough to keep it from
 * reading as a screenshot, and it costs a transform on the UI thread rather
 * than six decoders.
 *
 * `top` is where the wall begins, and it differs for the same reason. The offer
 * fills the screen and starts above it, so the tilt has run off the top edge
 * before there is anything to read. The paywall's wall is a band between the
 * status bar and the sheet, and starting it 140 points high there puts the
 * first row of faces off-screen and leaves the visible half looking like torsos.
 */

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

export function ResultWall({ clips = true, top = -140 }: { clips?: boolean; top?: number }) {
  return (
    <View style={[styles.wall, { top }]} pointerEvents="none">
      {COLUMNS.map((column) => (
        <DriftColumn key={column.seconds} seconds={column.seconds} tiles={column.tiles} clips={clips} />
      ))}
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
function DriftColumn({
  seconds,
  tiles,
  clips,
}: {
  seconds: number;
  tiles: readonly Tile[];
  clips: boolean;
}) {
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
          'clip' in tile && clips ? (
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
              contentPosition="top"
              style={{ height: tile.height }}
            />
          ),
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wall: {
    position: 'absolute',
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
});
