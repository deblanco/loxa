import { Image } from 'expo-image';
import { useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { color, radius } from '../theme';
import { Meta } from './Text';

/**
 * Where a photograph goes, whether or not there is one yet.
 *
 * The empty state wears the hatch from the design system so it reads as "a
 * picture goes here" rather than as a failed load. That is the whole reason the
 * placeholder is a component: an empty grey rectangle is indistinguishable from
 * a bug, and this screen is full of them before the user has picked a photo.
 */
interface Props {
  /**
   * A `data:` URI, a file URI, or a bundled asset from `require`. Absent draws
   * the placeholder.
   */
  uri?: string | number | null;
  /**
   * The head band in the picture, as fractions of its height, from the
   * manifest. Given one, the plate centres on that band and scales down until
   * it fits, instead of centring the whole frame and hoping.
   *
   * This is why the catalogue JPEGs are never re-cropped. The renders put the
   * crown anywhere from 5% to 33% down the frame, but the plate is `flex: 1`
   * and so is never quite the 9:16 the picture is — it shows a different band
   * of the image on every screen size. Baking a frame into the file can only be
   * right for one of them; doing it here is right on all of them, and keeps the
   * original.
   */
  focus?: { top: number; bottom: number };
  /**
   * Drawn instead when `uri` will not load. Only the onboarding wall passes
   * one: its pictures are served from the bucket but also shipped in the
   * binary, so a plate there has something better to show than the hatch.
   * Everywhere else the hatch is the honest answer — there is no second copy
   * of the user's own photograph.
   */
  fallback?: number;
  label?: string;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/** The renders are all 1080 × 1920. */
const PREVIEW_RATIO = 1920 / 1080;

/**
 * How much of the plate's height the head is allowed to take.
 *
 * The rest is breathing room, and it is what makes a big style work: an afro or
 * a high ponytail is scaled down until the crown clears the top edge, rather
 * than being cropped by it.
 */
const HEAD_FILL = 0.66;

export function PhotoPlate({ uri, focus, fallback, label, dark, style, children }: Props) {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const source = failed && fallback !== undefined ? fallback : uri;
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((current) =>
      current && current.width === width && current.height === height ? current : { width, height },
    );
  };

  // Sized so the head band takes HEAD_FILL of the plate, then centred on it.
  //
  // Never larger than covering the plate's width, so a small head is not blown
  // up; never smaller than covering its height, because the picture running out
  // above the bottom edge is a body stopping in mid-air. Running out at the
  // sides is fine — the render's backdrop is the plate's own colour, so the gap
  // cannot be seen.
  let aligned: { width: number; height: number; top: number; left: number } | null = null;
  if (focus && box && box.width > 0 && box.height > 0) {
    const band = Math.max(0.01, focus.bottom - focus.top);
    const cover = box.width * PREVIEW_RATIO;
    const height = Math.max(box.height, Math.min(cover, (box.height * HEAD_FILL) / band));
    const width = height / PREVIEW_RATIO;
    const centre = (focus.top + focus.bottom) / 2;
    aligned = {
      width,
      height,
      left: (box.width - width) / 2,
      top: Math.min(0, Math.max(box.height - height, box.height / 2 - centre * height)),
    };
  }

  return (
    <View style={[styles.plate, dark ? styles.dark : styles.light, style]} onLayout={onLayout}>
      {source ? (
        <Image
          source={typeof source === 'number' ? source : { uri: source }}
          style={
            aligned
              ? {
                  position: 'absolute',
                  left: aligned.left,
                  width: aligned.width,
                  height: aligned.height,
                  top: aligned.top,
                }
              : StyleSheet.absoluteFill
          }
          contentFit="cover"
          // The catalogue is served from R2 with a year of cache and immutable
          // keys, so a picture fetched once should never be fetched again. RN's
          // own Image leans on NSURLCache, which honours that but shares one
          // small budget with every other request and evicts invisibly; this
          // keeps its own disk cache, which is what makes the strip work on a
          // plane.
          cachePolicy="memory-disk"
          onError={fallback === undefined ? undefined : () => setFailed(true)}
          // No fade. The design system names four ambient loops and says they
          // are the only things on screen that move untouched; fifteen tiles
          // dissolving in is a fifth.
          transition={0}
        />
      ) : (
        <>
          <Hatch dark={dark} />
          {label ? (
            <View style={styles.label}>
              <Meta variant="note" tone={dark ? 'paper50' : 'ink45'} sentence style={styles.centered}>
                {label}
              </Meta>
              <Meta variant="note" tone={dark ? 'paper50' : 'ink45'} sentence style={styles.centered}>
                1080 × 1920
              </Meta>
            </View>
          ) : null}
        </>
      )}
      {children}
    </View>
  );
}

/**
 * The diagonal hatch, as stacked rotated bars.
 *
 * CSS gets this from one `repeating-linear-gradient`; RN has no such thing
 * without pulling in a gradient or an SVG for what is decoration on an empty
 * state. Fourteen absolutely-positioned views is the cheaper trade.
 */
function Hatch({ dark }: { dark?: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 14 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { top: i * 60 - 200, backgroundColor: dark ? 'rgba(255,255,255,0.07)' : color.ink07 },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    borderRadius: radius.plate,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  light: { backgroundColor: color.placeholder },
  dark: { backgroundColor: color.nightRaised },
  bar: {
    position: 'absolute',
    left: -200,
    right: -200,
    height: 12,
    transform: [{ rotate: '-12deg' }],
  },
  label: { alignItems: 'center' },
  centered: { textAlign: 'center' },
});
