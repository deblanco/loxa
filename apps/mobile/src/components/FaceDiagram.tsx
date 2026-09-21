import { StyleSheet, View } from 'react-native';
import { EDGES, LANDMARK_ORDER, idleGeometry } from '../face/geometry';
import { color, radius } from '../theme';

/**
 * The constellation, standing still, for explaining it rather than doing it.
 *
 * The onboarding has to show what the camera does before the camera has been
 * opened — it runs before any permission has been asked for, and on a simulator
 * Vision cannot build an inference context at all. So this draws the same eight
 * landmarks and the same lines from the same `idleGeometry` the viewfinder
 * falls back to, at a fixed size, with nothing moving.
 *
 * A sibling of `FaceConstellation` rather than a mode of it. That one is built
 * on shared values so a face arriving never re-renders React; this one has no
 * face, no frames and no Reanimated, and folding the two together would put a
 * camera's machinery inside a picture.
 *
 * **It is a diagram of a mechanism, not a claim about one.** The dots gate
 * nothing here, exactly as they gate nothing there.
 */
export function FaceDiagram({ size = 168 }: { size?: number }) {
  // The oval the camera asks a face to sit in, at this size. The geometry is a
  // function of the rectangle and nothing else, so it is computed here rather
  // than measured: there is no layout to wait for.
  const geometry = idleGeometry({ x: 0, y: 0, width: size, height: size * OVAL });

  return (
    <View style={[styles.frame, { width: size, height: size * OVAL }]}>
      <View style={[styles.oval, { borderRadius: size }]} />

      {EDGES.map(([from, to], index) => {
        const edge = geometry.edges[index];
        if (!edge) return null;
        return (
          <View
            key={`${from}-${to}`}
            style={[
              styles.link,
              {
                width: edge.length,
                transform: [
                  { translateX: edge.left },
                  { translateY: edge.top },
                  { rotate: `${edge.angle}deg` },
                ],
              },
            ]}
          />
        );
      })}

      {LANDMARK_ORDER.map((key) => {
        const point = geometry.points.find((candidate) => candidate.key === key);
        if (!point) return null;
        return (
          <View
            key={key}
            style={[styles.dot, { transform: [{ translateX: point.x }, { translateY: point.y }] }]}
          />
        );
      })}
    </View>
  );
}

/** The guide oval is taller than it is wide, as a head is. */
const OVAL = 1.3;

const DOT = 4;

const styles = StyleSheet.create({
  frame: { alignSelf: 'center' },
  // Ink on paper here, where the viewfinder draws paper on night: this sits on
  // the onboarding's own background, not over a photograph.
  oval: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: color.ink12,
    backgroundColor: color.surfaceSunken,
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    marginLeft: -DOT / 2,
    marginTop: -DOT / 2,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
  },
  link: {
    position: 'absolute',
    height: 1,
    backgroundColor: color.ink18,
    transformOrigin: '0 50%',
  },
});
