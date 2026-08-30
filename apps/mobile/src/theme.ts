/**
 * The React Native mirror of `design-system/tokens/*.css`.
 *
 * **The only file in this app allowed to contain a raw hex value.** The system
 * is CSS and this is not, so there is no import that could join them — the
 * mirror is maintained by hand, and a token change updates the CSS, this file
 * and `apps/web/app/globals.css` in the same commit.
 *
 * Names match the CSS custom properties one for one, minus the `--` and in
 * camelCase, so a token can be found by searching either file for the same word.
 */

export const color = {
  paper: '#faf8f5',
  ink: '#0d0c0b',

  night: '#100e0d',
  nightRaised: '#1a1715',

  surfaceRaised: '#f6f3ee',
  surfaceSunken: '#f2ede6',
  surfaceTrack: '#f0ebe3',
  placeholder: '#e7e1d8',

  // Ink at strength. Opacity rather than a lighter grey, so the warmth of the
  // paper comes through — a cold grey on this paper reads as dirt.
  ink80: 'rgba(13, 12, 11, 0.8)',
  ink72: 'rgba(13, 12, 11, 0.72)',
  ink60: 'rgba(13, 12, 11, 0.6)',
  ink55: 'rgba(13, 12, 11, 0.55)',
  ink45: 'rgba(13, 12, 11, 0.45)',
  ink40: 'rgba(13, 12, 11, 0.4)',
  ink30: 'rgba(13, 12, 11, 0.3)',
  ink18: 'rgba(13, 12, 11, 0.18)',
  ink12: 'rgba(13, 12, 11, 0.12)',
  ink09: 'rgba(13, 12, 11, 0.09)',
  ink07: 'rgba(13, 12, 11, 0.07)',

  paper85: 'rgba(250, 248, 245, 0.85)',
  paper66: 'rgba(250, 248, 245, 0.66)',
  paper60: 'rgba(250, 248, 245, 0.6)',
  paper50: 'rgba(250, 248, 245, 0.5)',
  paper30: 'rgba(250, 248, 245, 0.3)',
  paper16: 'rgba(250, 248, 245, 0.16)',

  scrim: 'rgba(13, 12, 11, 0.45)',
} as const;

/**
 * The three faces, by the names `expo-font` will register them under.
 *
 * `mono` is the platform's, not a loaded face: iOS ships Menlo, it is only ever
 * used for small letterspaced labels, and shipping a fourth font file to set
 * "HAIR STYLES" would be a poor trade.
 */
export const font = {
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  sans: 'InstrumentSans_400Regular',
  sansMedium: 'InstrumentSans_500Medium',
  sansSemibold: 'InstrumentSans_600SemiBold',
  mono: 'Menlo',
} as const;

/**
 * The ramp.
 *
 * The one deliberate divergence from the CSS: line heights are absolute here
 * rather than ratios, because RN's `lineHeight` is in points. Each is the CSS
 * ratio multiplied by the size and rounded, and they move together.
 */
export const type = {
  displayXl: { size: 58, line: 59, tracking: -0.9 },
  displayL: { size: 44, line: 45, tracking: -0.4 },
  displayM: { size: 40, line: 42, tracking: -0.4 },
  displayS: { size: 34, line: 37 },
  displayXs: { size: 30, line: 33 },
  numeral: { size: 44, line: 46 },
  price: { size: 22, line: 24 },

  wordmark: { size: 23, tracking: 5.5 },
  wordmarkSmall: { size: 21, tracking: 4.2 },

  button: { size: 16.5, line: 20 },
  body: { size: 14.5, line: 22 },
  bodySmall: { size: 13.5, line: 20 },
  caption: { size: 12.5, line: 17 },
  tile: { size: 11, line: 14 },

  metaLarge: { size: 12, tracking: 1.9 },
  meta: { size: 10, tracking: 1.4 },
  metaSmall: { size: 9.5, tracking: 0.95 },
  note: { size: 11, line: 18 },
} as const;

export const space = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
  s10: 40,
  s14: 56,

  gutterScreen: 16,
  gutterText: 18,
  gutterTextWide: 20,
  gutterHero: 26,

  insetTop: 60,
  insetBottom: 34,
} as const;

export const radius = {
  pill: 999,
  sheet: 26,
  card: 18,
  plate: 20,
  option: 16,
  tile: 12,
  chip: 10,
} as const;

/** The one shadow, and it only goes under a black control on paper. */
export const shadow = {
  control: {
    shadowColor: '#0d0c0b',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  float: {
    shadowColor: '#0d0c0b',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
} as const;

export const motion = {
  instant: 180,
  quick: 200,
  normal: 250,
  slow: 350,
  sheet: 320,
  fade: 1100,
  shimmer: 1800,
  scan: 2600,
  carouselHold: 3200,
} as const;
