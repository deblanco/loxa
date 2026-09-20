/**
 * The JSON in an answer that was asked for JSON.
 *
 * Both providers are told to answer with a bare object, and one of them is a
 * self-hosted endpoint that may or may not honour a response-format directive.
 * A model that wraps its answer in a markdown fence, or says "Sure —" first,
 * has still answered; throwing that away would make the feature fail for a
 * reason the user cannot see and we cannot fix from here.
 *
 * Returns null rather than throwing: the caller decides what an unreadable
 * answer means, and for this route it means "ask the other provider".
 */
export function extractJson(text: string): unknown | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * A draft, if the parsed thing looks like one.
 *
 * Shape only — whether the values mean anything is `core/suitability.ts`'s
 * question, and it is asked identically of both providers.
 */
export function readDraft(parsed: unknown): { faceShape: string; cuts: { styleId: string; reason: string }[] } | null {
  if (typeof parsed !== 'object' || parsed === null) return null;

  const { faceShape, cuts } = parsed as { faceShape?: unknown; cuts?: unknown };
  if (typeof faceShape !== 'string' || !Array.isArray(cuts)) return null;

  const read = cuts.flatMap((cut) => {
    if (typeof cut !== 'object' || cut === null) return [];
    const { styleId, reason } = cut as { styleId?: unknown; reason?: unknown };
    if (typeof styleId !== 'string' || typeof reason !== 'string') return [];
    return [{ styleId, reason }];
  });

  return { faceShape, cuts: read };
}
