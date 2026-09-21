import type { CatalogueResponse } from '@loxa/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { assetUrl } from '../api/assets';
import { colorsFor, heroKeys } from '../catalogue';
import { color, motion, radius, space } from '../theme';
import { PhotoPlate } from './PhotoPlate';
import { Body } from './Text';

/**
 * The catalogue, demonstrating itself.
 *
 * The welcome screen's first card claims the app puts a different cut and a
 * different colour on a face. A paragraph is a poor way to say that when the
 * art is already served: this shows one cut through three colours, then moves
 * to the next cut and does it again.
 *
 * It is the fifth ambient loop in a design system that spent four sentences
 * arguing for four — see `design-system/readme.md`. It earns the exception by
 * being the thing the sentence beside it describes, on a screen seen once.
 *
 * Everything here is the served catalogue, so it cannot advertise a cut the app
 * does not ship, and a cold or missing manifest leaves the hatch rather than a
 * gap. The name under it is the manifest's, for the same reason.
 */
export function StyleReel({ catalogue }: { catalogue: CatalogueResponse | null }) {
  // Cuts with at least three colours rendered, because the reel's whole claim
  // is the colour changing. Held for the life of the screen: a reel that
  // reshuffled under the user would be a second thing moving.
  const reel = useMemo(() => (catalogue ? buildReel(catalogue) : []), [catalogue]);

  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (reel.length < 2) return;
    const timer = setInterval(() => setFrame((current) => (current + 1) % reel.length), motion.reelHold);
    return () => clearInterval(timer);
  }, [reel.length]);

  const current = reel[frame % (reel.length || 1)];

  return (
    <View style={styles.reel}>
      <View style={styles.plate}>
        {reel.map((entry, index) => (
          <Fade key={entry.key} on={index === frame}>
            <PhotoPlate
              uri={assetUrl(entry.key)}
              focus={catalogue?.focus?.[entry.key]}
              contentFit="cover"
              style={styles.photo}
            />
          </Fade>
        ))}
        {/* Nothing served yet: the hatch, which is what every other plate in
            the app shows while it waits. */}
        {reel.length === 0 ? <PhotoPlate style={styles.photo} /> : null}

        {/*
          The face before any of this, in the corner — the same arrangement the
          result screen uses for the photo a render was made from, and the
          reason the card's claim is checkable rather than asserted: that
          person, this hair.

          Absent on a manifest built before the originals were uploaded, which
          is why it is conditional rather than assumed.
        */}
        {current?.modelKey ? (
          <View style={styles.inset} pointerEvents="none">
            <PhotoPlate uri={assetUrl(current.modelKey)} contentFit="cover" style={styles.insetPhoto} />
          </View>
        ) : null}
      </View>

      {current ? (
        <Body variant="tile" tone="ink55" style={styles.caption}>
          {current.styleName} · {current.colorName}
        </Body>
      ) : null}
    </View>
  );
}

/** One frame of the reel: a cut in a colour, with the picture that shows it. */
interface Frame {
  key: string;
  /** The photograph this model was restyled from, when the manifest carries one. */
  modelKey?: string;
  styleName: string;
  colorName: string;
}

/** How many cuts the reel walks, and how many colours it shows of each. */
const CUTS = 3;
const COLOURS = 3;

function buildReel(catalogue: CatalogueResponse): Frame[] {
  const frames: Frame[] = [];

  for (const style of catalogue.styles) {
    const colours = colorsFor(catalogue, style.id).slice(0, COLOURS);
    // A cut with one colour rendered would hold still while the caption
    // claimed a change. It waits for the generator to catch up.
    if (colours.length < COLOURS) continue;

    for (const colour of colours) {
      // Slot zero throughout: the reel is one face changing, and alternating
      // models mid-cut would read as the colour changing the person.
      const key = heroKeys(catalogue, style.id, colour.id)[0];
      if (!key) continue;
      frames.push({
        key,
        modelKey: style.models?.[0],
        styleName: style.name,
        colorName: colour.name,
      });
    }

    if (frames.length >= CUTS * COLOURS) break;
  }

  return frames;
}

/** The entry carousel's crossfade, at this screen's pace. */
function Fade({ on, children }: { on: boolean; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(on ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: on ? 1 : 0,
      duration: motion.normal,
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
  reel: { alignItems: 'center', gap: space.s2 + 2 },
  plate: {
    width: 244,
    height: 325,
    borderRadius: radius.plate,
    overflow: 'hidden',
    backgroundColor: color.placeholder,
  },
  slide: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  photo: { width: '100%', height: '100%', borderRadius: radius.plate },
  caption: { textAlign: 'center' },
  // Ringed in paper so it reads as a separate photograph rather than as part
  // of the render behind it — the result screen's inset, at this scale.
  inset: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    borderRadius: radius.tile,
    borderWidth: 2,
    borderColor: color.paper,
    overflow: 'hidden',
  },
  insetPhoto: { width: 62, height: 82, borderRadius: radius.tile },
});
