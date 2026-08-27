import type { RenderRequest } from '../ports/hair-renderer';

/**
 * The prompt, and it is mostly a list of things not to change.
 *
 * An image-editing model asked to "give this person a bob" will cheerfully also
 * smooth their skin, straighten their nose, warm the light and lose the
 * background — every one of those is a plausible improvement and every one of
 * them ruins the product, because the whole promise is *your* face with
 * different hair. The negative half of this prompt is doing the real work.
 *
 * Lives in `adapters/` rather than in `core/`: it is how we speak to one
 * particular model, and it will be retuned when the model changes. The style
 * and colour fragments it interpolates come from the catalogue in
 * `@loxa/shared`, so a stylist can retune a look without reading this file.
 */
export function buildHairPrompt(request: RenderRequest): string {
  return [
    'Edit the attached photograph of a person so that their hair is restyled and recoloured.',
    '',
    `Restyle the hair as ${request.stylePrompt}.`,
    `Colour the hair ${request.colorPrompt}.`,
    '',
    'Change nothing else. Keep the same person, the same face, the same facial',
    'features, the same skin tone and texture, the same expression, the same head',
    'angle, the same clothing, the same background and the same lighting. Do not',
    'retouch or beautify the skin. Do not slim, reshape or age the face. Do not',
    'change the eye colour. Do not add or remove makeup, jewellery or glasses.',
    '',
    'The new hair must sit on a plausible hairline for this person, fall with the',
    'weight and texture the style implies, and be lit by the light already in the',
    'photograph. Match the grain and depth of field of the original.',
    '',
    'Return the edited photograph.',
  ].join('\n');
}
