import { FACE_SHAPES } from '@loxa/shared';

/**
 * What the model is asked, and the only thing it is told about us.
 *
 * Built from `FACE_SHAPES` and from the catalogue it is handed rather than
 * written out, so a contract change or a withdrawn cut cannot drift from the
 * words. Ids and names only: `HairStyle.prompt` is this Worker's, and a
 * provider gets no more of our catalogue than the app does.
 *
 * The JSON shape is stated twice over — here in words and, where a provider
 * supports it, as a schema on the request. Belt and braces, because the
 * primary endpoint is somebody's own machine and may honour neither.
 */
export function buildSuitabilityPrompt(
  catalogue: readonly { id: string; name: string }[],
  limit: number,
): string {
  const cuts = catalogue.map((style) => `${style.id} — ${style.name}`).join('\n');

  return [
    'You are a hairstylist looking at photographs of one person.',
    'Read the proportions of their face: the width at the cheekbones, the width of the jaw, the length from brow to chin, the hairline.',
    `Decide which one of these face shapes fits best: ${FACE_SHAPES.join(', ')}.`,
    '',
    'Then choose the cuts below that would suit them, best first.',
    `Name at most ${limit}, and fewer if fewer genuinely suit them.`,
    'Use only these ids, exactly as written:',
    cuts,
    '',
    'Answer with JSON and nothing else. No prose around it, no markdown fence.',
    '{"faceShape":"<one of the shapes>","cuts":[{"styleId":"<one of the ids>","reason":"<one sentence>"}]}',
    'Each reason is one sentence, at most 140 characters, in English, about this face and this cut.',
    'Do not mention that you are an AI, do not hedge, and do not describe the photograph itself.',
  ].join('\n');
}
