import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from 'react-native';
import { color, font, type } from '../theme';

/**
 * The three voices, as three components.
 *
 * Nothing in this app calls `<Text>` directly: the design system says serif
 * states, sans operates and mono annotates, and the fastest way to lose that is
 * a raw Text with a fontFamily typed in beside it.
 */

type Variant = keyof typeof type;

interface Props extends TextProps {
  variant?: Variant;
  tone?: keyof typeof color;
  italic?: boolean;
  weight?: 'regular' | 'medium' | 'semibold';
}

function sized(variant: Variant): TextStyle {
  const t = type[variant] as { size: number; line?: number; tracking?: number };
  return {
    fontSize: t.size,
    ...(t.line ? { lineHeight: t.line } : {}),
    ...(t.tracking ? { letterSpacing: t.tracking } : {}),
  };
}

/** Statements: headlines, prices, the credit count, the wordmark. */
export function Display({ variant = 'displayM', tone = 'ink', italic, style, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[
        { fontFamily: italic ? font.serifItalic : font.serif, color: color[tone] },
        sized(variant),
        style,
      ]}
    />
  );
}

/** The interface: buttons, body, rows, tiles. */
export function Body({ variant = 'body', tone = 'ink', weight = 'regular', style, ...rest }: Props) {
  const family =
    weight === 'semibold' ? font.sansSemibold : weight === 'medium' ? font.sansMedium : font.sans;

  return <RNText {...rest} style={[{ fontFamily: family, color: color[tone] }, sized(variant), style]} />;
}

/**
 * Annotations: section headers, counts, technical asides.
 *
 * Uppercased and letterspaced by default, because that is what makes mono read
 * as an annotation rather than as a font mistake. `sentence` opts out for the
 * few places the prototype sets mono in sentence case.
 */
export function Meta({
  variant = 'meta',
  tone = 'ink45',
  style,
  sentence,
  children,
  ...rest
}: Props & { sentence?: boolean }) {
  return (
    <RNText
      {...rest}
      style={[
        { fontFamily: font.mono, color: color[tone] },
        sized(variant),
        !sentence && styles.upper,
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  upper: { textTransform: 'uppercase' },
});
