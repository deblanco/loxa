/**
 * The hair style catalogue.
 *
 * Data, not code: the strip on the preview screen renders whatever is in this
 * array, and the prompt fragment travels with the name so a style can be
 * retuned without touching the renderer. The ten below are the prototype's; the
 * strip header already says "All 24" and is waiting on photography.
 *
 * `prompt` is written to complete the sentence "restyle the hair as …". Keep it
 * describing the *hair* and nothing else — a fragment that mentions the face,
 * the lighting or the background is a fragment that will change them.
 */
export interface HairStyle {
  id: string;
  /** Shown under the tile. Sentence case, because it is a name, not a label. */
  name: string;
  /** Completes "restyle the hair as …". */
  prompt: string;
  /** Key in the R2 assets bucket. Placeholder art until the shoot happens. */
  thumbnailKey: string;
}

export const HAIR_STYLES: readonly HairStyle[] = [
  {
    id: 'blunt-bob',
    name: 'Blunt bob',
    prompt: 'a blunt chin-length bob with a hard, level cut line and no layers',
    thumbnailKey: 'styles/blunt-bob.jpg',
  },
  {
    id: 'long-layers',
    name: 'Long layers',
    prompt: 'long hair falling past the collarbone with soft face-framing layers',
    thumbnailKey: 'styles/long-layers.jpg',
  },
  {
    id: 'curtain-bang',
    name: 'Curtain bang',
    prompt: 'a centre-parted curtain fringe sweeping away from the face, blended into long hair',
    thumbnailKey: 'styles/curtain-bang.jpg',
  },
  {
    id: 'pixie',
    name: 'Pixie',
    prompt: 'a short pixie cut, cropped close at the nape and textured on top',
    thumbnailKey: 'styles/pixie.jpg',
  },
  {
    id: 'wolf-cut',
    name: 'Wolf cut',
    prompt: 'a shaggy wolf cut with heavy disconnected layers and a wispy fringe',
    thumbnailKey: 'styles/wolf-cut.jpg',
  },
  {
    id: 'beach-waves',
    name: 'Beach waves',
    prompt: 'loose, undone beach waves with a soft irregular bend through the mid-lengths',
    thumbnailKey: 'styles/beach-waves.jpg',
  },
  {
    id: 'sleek-straight',
    name: 'Sleek straight',
    prompt: 'poker-straight hair, pressed flat and glossy, with a sharp centre parting',
    thumbnailKey: 'styles/sleek-straight.jpg',
  },
  {
    id: 'braids',
    name: 'Braids',
    prompt: 'neat braids gathered back from the hairline',
    thumbnailKey: 'styles/braids.jpg',
  },
  {
    id: 'curly-shag',
    name: 'Curly shag',
    prompt: 'a curly shag with defined ringlets, volume at the crown and a short fringe',
    thumbnailKey: 'styles/curly-shag.jpg',
  },
  {
    id: 'buzz',
    name: 'Buzz',
    prompt: 'a uniform buzz cut, clipped short and even across the whole head',
    thumbnailKey: 'styles/buzz.jpg',
  },
] as const;

export const HAIR_STYLE_IDS = HAIR_STYLES.map((style) => style.id);

/** The tile selected on a first run, before anyone has chosen anything. */
export const DEFAULT_STYLE_ID = 'blunt-bob';

export function findStyle(id: string): HairStyle | undefined {
  return HAIR_STYLES.find((style) => style.id === id);
}
