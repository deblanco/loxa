import { View } from 'react-native';
import { radius } from '../theme';

/**
 * The flip-camera mark: a camera body with a rotation arrow either side.
 *
 * Drawn from views, like the `Chevron`, for the same reason — the app owns no
 * SVG runtime, and the glyph this replaced (`⟳`) rendered as a speck in the
 * middle of the button, because a typeface's rotation arrow occupies a fraction
 * of its em and no two faces agree on which fraction.
 *
 * The geometry is the prototype's SVG, scaled: a 24-unit box, a body at
 * `2.5,6.5` 19 × 13.5, a lens of radius 3.4 at `12,13.2`, a hump over the
 * middle, and the two arrowheads at `17.3,9.7` and `6.7,16.8`. `size` is that
 * box, so everything below is a fraction of it and the mark is the same drawing
 * at any button size.
 *
 * The hump's sides are vertical where the prototype slopes them. That is the
 * one simplification: a trapezoid needs a transform per side, and at 28pt the
 * slope is under a point of ink.
 */
export function FlipIcon({ size = 28, color = '#fff' }: { size?: number; color?: string }) {
  const u = size / 24;
  const stroke = 1.6 * u;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: 2.5 * u,
          top: 6.5 * u,
          width: 19 * u,
          height: 13.5 * u,
          borderRadius: 3 * u,
          borderWidth: stroke,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 10.5 * u,
          top: 4.4 * u,
          width: 3 * u,
          height: 2.5 * u,
          borderTopLeftRadius: u,
          borderTopRightRadius: u,
          borderTopWidth: stroke,
          borderLeftWidth: stroke,
          borderRightWidth: stroke,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 8.6 * u,
          top: 9.8 * u,
          width: 6.8 * u,
          height: 6.8 * u,
          borderRadius: radius.pill,
          borderWidth: stroke,
          borderColor: color,
        }}
      />
      {/* Pointing up on the right of the body and down on the left, which is
          what reads as a turn rather than as two ticks. */}
      <Arrowhead u={u} stroke={stroke} color={color} x={17.3} y={9.7} up />
      <Arrowhead u={u} stroke={stroke} color={color} x={6.7} y={16.8} />
    </View>
  );
}

/**
 * One arrowhead, apex at `x,y` in the 24-unit box.
 *
 * A square drawn on two adjacent borders and turned 45°, so its arms run along
 * the diagonals — the prototype's arms are 1.7 units each way, which is a side
 * of 2.4. Rotating about the centre puts the corner between those two borders
 * `0.707 × side` away from it, which is why the apex is not simply the box's
 * own top: the offset below is that distance, and without it the mark sits a
 * point and a half off where the drawing says.
 */
const ARM = 2.4;

function Arrowhead({
  u,
  stroke,
  color,
  x,
  y,
  up,
}: {
  u: number;
  stroke: number;
  color: string;
  x: number;
  y: number;
  up?: boolean;
}) {
  const side = ARM * u;
  const centre = y * u + (up ? 1 : -1) * 0.707 * side;

  return (
    <View
      style={[
        {
          position: 'absolute',
          left: x * u - side / 2,
          top: centre - side / 2,
          width: side,
          height: side,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        },
        up
          ? { borderTopWidth: stroke, borderLeftWidth: stroke }
          : { borderBottomWidth: stroke, borderRightWidth: stroke },
      ]}
    />
  );
}
