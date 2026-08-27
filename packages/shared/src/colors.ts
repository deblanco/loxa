/**
 * The hair colour catalogue.
 *
 * `hex` is the swatch on the strip, not an instruction to the model — a flat
 * fill and a head of hair are different things, and asking for "#c99a5c hair"
 * produces a wig. The model gets `prompt`; the strip gets `hex`.
 */
export interface HairColor {
  id: string;
  /** Shown beside the strip header when selected. */
  name: string;
  /** The swatch. Never sent to the model. */
  hex: string;
  /** Completes "coloured …". */
  prompt: string;
}

export const HAIR_COLORS: readonly HairColor[] = [
  { id: 'jet-black', name: 'Jet black', hex: '#14110f', prompt: 'a deep jet black with a cool blue-black sheen' },
  { id: 'espresso', name: 'Espresso', hex: '#3a2418', prompt: 'a dark espresso brown, warm and nearly black in shadow' },
  { id: 'chestnut', name: 'Chestnut', hex: '#6b4226', prompt: 'a mid chestnut brown with warm red undertones' },
  { id: 'caramel', name: 'Caramel', hex: '#a46c3c', prompt: 'a warm caramel brown, lighter through the mid-lengths and ends' },
  { id: 'honey-blonde', name: 'Honey blonde', hex: '#c99a5c', prompt: 'a golden honey blonde with a slightly deeper root' },
  { id: 'platinum', name: 'Platinum', hex: '#e2d8c4', prompt: 'a pale platinum blonde, almost white, evenly lifted from root to tip' },
  { id: 'ash-grey', name: 'Ash grey', hex: '#9a958f', prompt: 'a cool ash grey with no warmth or yellow in it' },
  { id: 'copper', name: 'Copper', hex: '#b4592b', prompt: 'a bright copper red with visible orange in the light' },
  { id: 'cherry', name: 'Cherry', hex: '#7d2230', prompt: 'a deep cherry red, cool and wine-toned rather than orange' },
  { id: 'lilac', name: 'Lilac', hex: '#b7a3c8', prompt: 'a pastel lilac, soft and slightly greyed rather than vivid' },
] as const;

export const HAIR_COLOR_IDS = HAIR_COLORS.map((color) => color.id);

/** Caramel — the prototype opens on it, and a mid brown flatters the widest range of faces. */
export const DEFAULT_COLOR_ID = 'caramel';

export function findColor(id: string): HairColor | undefined {
  return HAIR_COLORS.find((color) => color.id === id);
}
