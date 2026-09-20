/**
 * The domain's failures.
 *
 * Core throws these; `adapters/http` is the only place that knows what status
 * code each one deserves. That split is what lets a use case be tested without
 * a Response anywhere near it.
 */

export class OutOfCreditsError extends Error {
  constructor() {
    super('no credits left');
    this.name = 'OutOfCreditsError';
  }
}

/**
 * The request named a style or a colour this Worker has no prompt for.
 *
 * Reachable, and a 400 rather than a 500. The wire schema used to enumerate the
 * catalogue's ids, so an unknown one could not get this far and arriving here
 * meant our own build had come apart. It no longer does: the catalogue the app
 * draws is served and can be a *subset* of what ships, and an old client with a
 * stale manifest can ask for a cut that has since been withdrawn. That is the
 * client naming something that does not exist, which is a bad request.
 */
export class UnknownStyleError extends Error {
  constructor(styleId: string, colorId: string) {
    super(`unknown style or colour: ${styleId}/${colorId}`);
    this.name = 'UnknownStyleError';
  }
}

/** The model refused the photo — a safety stop, or no face in it. */
export class PhotoRejectedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'PhotoRejectedError';
  }
}

/** The model could not be reached, or answered with something that is not an image. */
export class RendererUnavailableError extends Error {
  /**
   * Whether a second provider is worth asking.
   *
   * True only for a rate limit, an upstream 5xx, or a host that could not be
   * reached — failures about the provider rather than about the request. A 400
   * or a 401 is our bug or our deployment, and sending the identical request to
   * somebody else bills it twice and hides the fault.
   *
   * Nothing in core or in `adapters/http` reads this: both errors are still a
   * 502. Only `adapters/fallback-renderer.ts` does.
   */
  readonly transient: boolean;

  constructor(reason: string, transient = false) {
    super(reason);
    this.name = 'RendererUnavailableError';
    this.transient = transient;
  }
}

/**
 * A provider answered, and what it said was unusable.
 *
 * Not the same as a provider being down: the call succeeded and was billed,
 * and it is the *content* that cannot be shown — a face shape that is not one
 * of ours, or a list of cuts with nothing left in it once the invented ids were
 * dropped. A 502 either way, because there is nothing the user did wrong and
 * nothing they can do about it.
 */
export class AnalysisUnusableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'AnalysisUnusableError';
  }
}

/**
 * This device has asked for enough analyses today.
 *
 * The analysis route spends no credit, so this is what stands between it and a
 * model bill with no ceiling. A 429 rather than a 402: buying credits would
 * change nothing, and the fix is to come back tomorrow.
 */
export class AnalysisQuotaError extends Error {
  constructor() {
    super('too many analyses today');
    this.name = 'AnalysisQuotaError';
  }
}
