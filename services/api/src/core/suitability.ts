import { FACE_SHAPES, MAX_REASON, type FaceShape } from '@loxa/shared';
import { AnalysisUnusableError } from './errors';
import type { SuitabilityDraft } from '../ports/face-analyst';

/**
 * Believing a model, carefully.
 *
 * Everything a provider hands back passes through here before it is stored,
 * cached or sent. The rules are product rules, which is why they are in core
 * and not in either adapter: two providers answer this route and they must be
 * held to the identical standard, provable once with no binding in sight.
 *
 * The shape of the distrust is deliberate and asymmetric:
 *
 * - A **cut we do not have** is dropped. Models invent plausible haircuts, and
 *   a row the app cannot render is worse than a shorter list.
 * - A **face shape we do not have** throws the whole answer away. It is not
 *   dropped and it does not fall back to a default, because this answer
 *   *overrides* the shape the phone measured for itself — quietly replacing a
 *   real measurement with a guess is the one failure the user could not see.
 * - **Prose** is cleaned rather than refused: control characters out,
 *   whitespace collapsed, hard-capped. It is displayed as text and never as
 *   markup; see `suitableCutSchema` in the contracts.
 */
export const MAX_CUTS = 6;

export interface Suitability {
  faceShape: FaceShape;
  cuts: { styleId: string; reason: string }[];
}

export function validateSuitability(
  draft: SuitabilityDraft,
  allowed: ReadonlySet<string>,
): Suitability {
  const faceShape = normalise(draft.faceShape);
  if (!isFaceShape(faceShape)) {
    throw new AnalysisUnusableError(`not a face shape: ${draft.faceShape}`);
  }

  const cuts: { styleId: string; reason: string }[] = [];
  const seen = new Set<string>();

  for (const cut of draft.cuts) {
    const styleId = normalise(cut.styleId);
    // First occurrence wins, so the ranking the model chose survives the
    // de-duplication rather than being reversed by it.
    if (!allowed.has(styleId) || seen.has(styleId)) continue;

    const reason = clean(cut.reason);
    if (!reason) continue;

    seen.add(styleId);
    cuts.push({ styleId, reason });
    if (cuts.length === MAX_CUTS) break;
  }

  // Nothing survived: the model named six cuts and we ship none of them, which
  // is a broken answer rather than an empty one. The user waited for this.
  if (cuts.length === 0) {
    throw new AnalysisUnusableError('no cut in the answer is one we ship');
  }

  return { faceShape, cuts };
}

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

function isFaceShape(value: string): value is FaceShape {
  return (FACE_SHAPES as readonly string[]).includes(value);
}

/** One line of prose, or nothing. */
function clean(reason: string): string {
  return reason
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_REASON);
}
