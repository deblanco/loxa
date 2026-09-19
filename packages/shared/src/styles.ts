import type { FaceShape } from './contracts';

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
  /**
   * The face shapes this cut is usually suggested for — conventional stylist
   * guidance, not a rule, and phrased to the user as "often suits". Oval is on
   * every cut because that is what oval means in this vocabulary. Unlike the
   * prompt, this is published in the manifest.
   */
  suits: readonly FaceShape[];
  /** Completes "restyle the hair as …". */
  prompt: string;
}

export const HAIR_STYLES: readonly HairStyle[] = [
  {
    id: 'blunt-bob',
    name: 'Blunt bob',
    suits: ['oval', 'heart', 'long'],
    prompt: 'a blunt chin-length bob with a hard, level cut line and no layers',
  },
  {
    id: 'long-layers',
    name: 'Long layers',
    suits: ['oval', 'round', 'square', 'heart'],
    prompt: 'long hair falling past the collarbone with soft face-framing layers',
  },
  {
    id: 'curtain-bang',
    name: 'Curtain bang',
    suits: ['oval', 'square', 'heart', 'long'],
    prompt: 'a centre-parted curtain fringe sweeping away from the face, blended into long hair',
  },
  {
    id: 'pixie',
    name: 'Pixie',
    suits: ['oval', 'heart'],
    prompt: 'a short pixie cut, cropped close at the nape and textured on top',
  },
  {
    id: 'wolf-cut',
    name: 'Wolf cut',
    suits: ['oval', 'square', 'long'],
    prompt: 'a shaggy wolf cut with heavy disconnected layers and a wispy fringe',
  },
  {
    id: 'beach-waves',
    name: 'Beach waves',
    suits: ['oval', 'square', 'heart', 'long'],
    prompt: 'loose, undone beach waves with a soft irregular bend through the mid-lengths',
  },
  {
    id: 'sleek-straight',
    name: 'Sleek straight',
    suits: ['oval', 'round', 'heart'],
    prompt: 'poker-straight hair, pressed flat and glossy, with a sharp centre parting',
  },
  {
    id: 'braids',
    name: 'Braids',
    suits: ['oval', 'heart'],
    prompt: 'neat braids gathered back from the hairline',
  },
  {
    id: 'curly-shag',
    name: 'Curly shag',
    suits: ['oval', 'square', 'heart', 'long'],
    prompt: 'a curly shag with defined ringlets, volume at the crown and a short fringe',
  },
  {
    id: 'buzz',
    name: 'Buzz',
    suits: ['oval'],
    prompt: 'a uniform buzz cut, clipped short and even across the whole head',
  },
  {
    id: 'lob',
    name: 'Long bob',
    suits: ['oval', 'round', 'square', 'heart'],
    prompt: 'a collarbone-length lob, cut one length with a slight forward angle towards the jaw',
  },
  {
    id: 'french-bob',
    name: 'French bob',
    suits: ['oval', 'heart', 'long'],
    prompt: 'a short french bob ending just below the ears, worn with a soft micro fringe',
  },
  {
    id: 'bixie',
    name: 'Bixie',
    suits: ['oval', 'round', 'heart'],
    prompt: 'a bixie, cut between a bob and a pixie, heavily textured through the ends',
  },
  {
    id: 'blunt-fringe',
    name: 'Blunt fringe',
    suits: ['oval', 'heart', 'long'],
    prompt: 'a heavy blunt fringe cut straight across the brows, above long one-length hair',
  },
  {
    id: 'waist-length',
    name: 'Waist length',
    suits: ['oval', 'round', 'square'],
    prompt: 'very long hair falling to the waist, cut one length with a blunt hem',
  },
  {
    id: 'blowout',
    name: 'Blowout',
    suits: ['oval', 'square', 'long'],
    prompt: 'a bouncy blowout with rounded volume at the roots and the ends curled under',
  },
  {
    id: 'seventies-flick',
    name: 'Seventies flick',
    suits: ['oval', 'square', 'heart', 'long'],
    prompt: 'long feathered layers flicked out and sweeping back away from the face',
  },
  {
    id: 'mullet',
    name: 'Mullet',
    suits: ['oval', 'square'],
    prompt: 'a modern mullet, choppy through the top and sides with the length left long at the nape',
  },
  {
    id: 'afro',
    name: 'Afro',
    suits: ['oval', 'heart', 'long'],
    prompt: 'a rounded afro, picked out into an even halo of tightly coiled natural hair',
  },
  {
    id: 'locs',
    name: 'Locs',
    suits: ['oval', 'round', 'square'],
    prompt: 'shoulder-length locs, evenly formed and falling loose from a centre parting',
  },
  {
    id: 'bantu-knots',
    name: 'Bantu knots',
    suits: ['oval', 'heart'],
    prompt: 'hair sectioned into a clean grid and wound into small coiled knots across the head',
  },
  {
    id: 'high-ponytail',
    name: 'High ponytail',
    suits: ['oval', 'round', 'heart'],
    prompt: 'a high sleek ponytail tied at the crown, the lengths falling straight behind the head',
  },
  {
    id: 'chignon',
    name: 'Chignon',
    suits: ['oval', 'square', 'heart'],
    prompt: 'a low chignon coiled and pinned at the nape, below a clean centre parting',
  },
  {
    id: 'half-up-knot',
    name: 'Half-up knot',
    suits: ['oval', 'round', 'heart'],
    prompt: 'the top section gathered into a small knot at the crown with the rest left loose',
  },
] as const;

export const HAIR_STYLE_IDS = HAIR_STYLES.map((style) => style.id);

/** The tile selected on a first run, before anyone has chosen anything. */
export const DEFAULT_STYLE_ID = 'blunt-bob';

export function findStyle(id: string): HairStyle | undefined {
  return HAIR_STYLES.find((style) => style.id === id);
}
