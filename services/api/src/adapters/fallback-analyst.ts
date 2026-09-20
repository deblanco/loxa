import { RendererUnavailableError } from '../core/errors';
import type { FaceAnalystPort } from '../ports/face-analyst';

/**
 * Two analysts, one port.
 *
 * Deliberately not generalised with `fallbackRenderer` into one helper. The
 * logic is four lines; what is worth keeping is the paragraph explaining why a
 * rejected photograph does not fall through, and a shared wrapper would keep
 * the four lines and lose the paragraph.
 *
 * Only a transient failure falls through. A `PhotoRejectedError` is a verdict
 * on the photograph and the second provider would reach the same one; an answer
 * that was already validated and refused never gets here at all, because
 * validation happens in core, after this composite has returned.
 *
 * The primary here is the endpoint we run ourselves, so "transient" covers more
 * than it does for the renderer — see `adapters/codex/analyst.ts`. A box that
 * is down, mis-keyed or answering prose is all the same thing from here: ask
 * Google instead.
 */
export function fallbackAnalyst(
  primary: FaceAnalystPort,
  secondary: FaceAnalystPort,
): FaceAnalystPort {
  return {
    async analyse(request) {
      try {
        return await primary.analyse(request);
      } catch (err) {
        if (!(err instanceof RendererUnavailableError) || !err.transient) throw err;

        // Worth a line in the log: once the secondary answers, the primary
        // having been unreachable is invisible from the outside.
        console.warn('primary analyst unavailable, falling back', err.message);

        return await secondary.analyse(request);
      }
    },
  };
}

/**
 * No analyst at all.
 *
 * A deployment with neither provider configured cannot answer this route, and
 * says so rather than guessing. It exists so that `FaceAnalystPort` stays
 * non-nullable all the way into core: there is no "if there is an analyst"
 * branch anywhere, which is one fewer path to get wrong and one fewer to test.
 *
 * This is where the parallel with `OPENROUTER_API_KEY` breaks. That key unset
 * costs availability; both of these unset costs the feature, so it is not a
 * supported state — it is a misconfiguration that answers 502 until it is
 * fixed.
 */
export function unavailableAnalyst(): FaceAnalystPort {
  return {
    async analyse() {
      throw new RendererUnavailableError('no analysis provider is configured', false);
    },
  };
}
