/**
 * The hair style catalogue.
 *
 * Data, not code: the strip on the preview screen renders whatever is in this
 * array, and the prompt fragment travels with the name so a style can be
 * retuned without touching the renderer.
 *
 * `prompt` is written to complete the sentence "restyle the hair as …". Keep it
 * describing the *hair* and nothing else — a fragment that mentions the face,
 * the lighting or the background is a fragment that will change them.
 *
 * There is no thumbnail key here. Every style carries a tile and, for each
 * colour, a pair of model previews, which is far too many strings to keep by
 * hand — the keys are derived from the ids instead, in `previews.ts`.
 */
export interface HairStyle {
  id: string;
  /** Shown under the tile. Sentence case, because it is a name, not a label. */
  name: string;
  /** Completes "restyle the hair as …". */
  prompt: string;
}

export const HAIR_STYLES: readonly HairStyle[] = [
  {
    id: 'blunt-bob',
    name: 'Blunt bob',
    prompt: 'a blunt chin-length bob with a hard, level cut line and no layers',
  },
  {
    id: 'long-layers',
    name: 'Long layers',
    prompt: 'long hair falling past the collarbone with soft face-framing layers',
  },
  {
    id: 'curtain-bang',
    name: 'Curtain bang',
    prompt: 'a centre-parted curtain fringe sweeping away from the face, blended into long hair',
  },
  {
    id: 'pixie',
    name: 'Pixie',
    prompt: 'a short pixie cut, cropped close at the nape and textured on top',
  },
  {
    id: 'wolf-cut',
    name: 'Wolf cut',
    prompt: 'a shaggy wolf cut with heavy disconnected layers and a wispy fringe',
  },
  {
    id: 'beach-waves',
    name: 'Beach waves',
    prompt: 'loose, undone beach waves with a soft irregular bend through the mid-lengths',
  },
  {
    id: 'sleek-straight',
    name: 'Sleek straight',
    prompt: 'poker-straight hair, pressed flat and glossy, with a sharp centre parting',
  },
  {
    id: 'braids',
    name: 'Braids',
    prompt: 'neat braids gathered back from the hairline',
  },
  {
    id: 'curly-shag',
    name: 'Curly shag',
    prompt: 'a curly shag with defined ringlets, volume at the crown and a short fringe',
  },
  {
    id: 'buzz',
    name: 'Buzz',
    prompt: 'a uniform buzz cut, clipped short and even across the whole head',
  },
  {
    id: 'lob',
    name: 'Long bob',
    prompt: 'a collarbone-length lob, cut one length with a slight forward angle towards the jaw',
  },
  {
    id: 'french-bob',
    name: 'French bob',
    prompt: 'a short french bob ending just below the ears, worn with a soft micro fringe',
  },
  {
    id: 'bixie',
    name: 'Bixie',
    prompt: 'a bixie, cut between a bob and a pixie, heavily textured through the ends',
  },
  {
    id: 'blunt-fringe',
    name: 'Blunt fringe',
    prompt: 'a heavy blunt fringe cut straight across the brows, above long one-length hair',
  },
  {
    id: 'waist-length',
    name: 'Waist length',
    prompt: 'very long hair falling to the waist, cut one length with a blunt hem',
  },
  {
    id: 'blowout',
    name: 'Blowout',
    prompt: 'a bouncy blowout with rounded volume at the roots and the ends curled under',
  },
  {
    id: 'seventies-flick',
    name: 'Seventies flick',
    prompt: 'long feathered layers flicked out and sweeping back away from the face',
  },
  {
    id: 'mullet',
    name: 'Mullet',
    prompt: 'a modern mullet, choppy through the top and sides with the length left long at the nape',
  },
  {
    id: 'afro',
    name: 'Afro',
    prompt: 'a rounded afro, picked out into an even halo of tightly coiled natural hair',
  },
  {
    id: 'locs',
    name: 'Locs',
    prompt: 'shoulder-length locs, evenly formed and falling loose from a centre parting',
  },
  {
    id: 'bantu-knots',
    name: 'Bantu knots',
    prompt: 'hair sectioned into a clean grid and wound into small coiled knots across the head',
  },
  {
    id: 'high-ponytail',
    name: 'High ponytail',
    prompt: 'a high sleek ponytail tied at the crown, the lengths falling straight behind the head',
  },
  {
    id: 'chignon',
    name: 'Chignon',
    prompt: 'a low chignon coiled and pinned at the nape, below a clean centre parting',
  },
  {
    id: 'half-up-knot',
    name: 'Half-up knot',
    prompt: 'the top section gathered into a small knot at the crown with the rest left loose',
  },
] as const;

export const HAIR_STYLE_IDS = HAIR_STYLES.map((style) => style.id);

/** The tile selected on a first run, before anyone has chosen anything. */
export const DEFAULT_STYLE_ID = 'blunt-bob';

export function findStyle(id: string): HairStyle | undefined {
  return HAIR_STYLES.find((style) => style.id === id);
}
