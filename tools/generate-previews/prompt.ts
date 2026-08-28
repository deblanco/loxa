import type { HairColor, HairStyle } from '@loxa/shared';

/**
 * The prompt that makes the catalogue art, kept because the run is repeatable
 * and a prompt nobody wrote down is a run nobody can repeat.
 *
 * This is deliberately *not* `services/api/src/adapters/hair-prompt.ts`. That
 * one is spoken to a stranger's photograph and its whole job is to change the
 * hair and nothing else — it says "keep the same background and the same
 * lighting" because the background is the user's kitchen and it is theirs to
 * keep. Here the background belongs to us, the source frames are 3:4 studio
 * busts on a cool grey seamless, and the app is a 9:16 warm-paper screen. So
 * this prompt keeps every identity clause and inverts the background one.
 *
 * Three things it asks for that the runtime prompt does not, each for a reason:
 *
 * 1. `#E7E1D8` is `--placeholder` from `design-system/tokens/colors.css` — the
 *    exact fill of the hatched plate the picture is about to land in. A tile
 *    that shares its ground with the plate behind it does not flash when it
 *    loads, and does not punch a cold grey hole in warm paper. The design
 *    system is blunt that a cold grey on this paper "reads as dirt".
 * 2. The 9:16 recomposition, because the sources are 3:4 and the plate is 9:16.
 *    Asked for in words *and* in `imageConfig.aspectRatio` — the config decides
 *    the pixels, the words decide where the head sits inside them.
 * 3. Even frontal light, because twenty-four tiles in a row are read as one
 *    set. One dramatically lit cut in the middle of the strip looks like a bug.
 */
export function buildPreviewPrompt(style: HairStyle, color: HairColor): string {
  return [
    'Edit the attached studio photograph of a person so that their hair is restyled and recoloured.',
    '',
    `Restyle the hair as ${style.prompt}.`,
    `Colour the hair ${color.prompt}.`,
    '',
    'Keep the same person. Keep the same face, the same facial features, the same',
    'skin tone and texture, the same expression and the same head angle. Do not',
    'retouch or beautify the skin. Do not slim, reshape or age the face. Do not',
    'change the eye colour. Do not add or remove makeup, jewellery or glasses.',
    '',
    'The new hair must sit on a plausible hairline for this person and fall with',
    'the weight and texture the style implies.',
    '',
    'Replace the backdrop with a single flat, even, seamless warm off-white in the',
    'colour #E7E1D8. The backdrop must be one uniform tone edge to edge: no',
    'gradient, no vignette, no visible corners or floor line, and no shadow cast',
    'onto it. Light the person with soft, even, frontal studio light with no hard',
    'shadows, so that the hair reads clearly against the backdrop.',
    '',
    'Compose the result as an upright 9:16 portrait. Centre the head horizontally,',
    'place the eyes a little above the middle of the frame, and leave clear space',
    'above the crown so that no hair is cropped by the top edge. Crop the body at',
    'the collarbone. Keep the shoulders bare and the frame free of clothing,',
    'text, logos and props.',
    '',
    'Return the edited photograph.',
  ].join('\n');
}
