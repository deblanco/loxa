import { RendererUnavailableError } from '../core/errors';
import type { HairRendererPort } from '../ports/hair-renderer';

/**
 * Two renderers, one port.
 *
 * `core/try-on.ts` spends the credit, calls `render`, and refunds on any throw.
 * Because this composite *is* a renderer, the second attempt happens inside
 * that single call: the credit is refunded only when both providers have
 * failed, and the ledger never learns there were two. Putting the fallback in
 * core instead would mean spending twice, or unpicking the refund.
 *
 * Only a transient failure falls through. A `PhotoRejectedError` is a verdict
 * on the user's photograph and the same model returns the same verdict one
 * billed call later; a non-transient `RendererUnavailableError` is our request
 * or our key, and asking a second provider the same broken question buys
 * nothing but a second bill.
 */
export function fallbackRenderer(
  primary: HairRendererPort,
  secondary: HairRendererPort,
): HairRendererPort {
  return {
    async render(request) {
      try {
        return await primary.render(request);
      } catch (err) {
        if (!(err instanceof RendererUnavailableError) || !err.transient) throw err;

        // Worth a line in the log: this is the primary being rate-limited or
        // down, which is invisible from the outside once the fallback succeeds.
        console.warn('primary renderer unavailable, falling back', err.message);

        // Whatever the secondary says is the last word on this request — if it
        // throws, that is the error the user's status code is built from.
        return await secondary.render(request);
      }
    },
  };
}
