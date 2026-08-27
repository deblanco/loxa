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

/** The model refused the photo — a safety stop, or no face in it. */
export class PhotoRejectedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'PhotoRejectedError';
  }
}

/** The model could not be reached, or answered with something that is not an image. */
export class RendererUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'RendererUnavailableError';
  }
}
