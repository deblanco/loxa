import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
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
  /** A `data:` URI or a file URI. Absent draws the placeholder. */
  uri?: string | null;
  label?: string;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function PhotoPlate({ uri, label, dark, style, children }: Props) {
  return (
    <View style={[styles.plate, dark ? styles.dark : styles.light, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          // The catalogue is served from R2 with a year of cache and immutable
          // keys, so a picture fetched once should never be fetched again. RN's
          // own Image leans on NSURLCache, which honours that but shares one
          // small budget with every other request and evicts invisibly; this
          // keeps its own disk cache, which is what makes the strip work on a
          // plane.
          cachePolicy="memory-disk"
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
