export interface RenderRequest {
  /** The user's photo. Base64, JPEG, no data: prefix. */
  imageBase64: string;
  /** Completes "restyle the hair as …". From the catalogue in @loxa/shared. */
  stylePrompt: string;
  /** Completes "coloured …". */
  colorPrompt: string;
}

export interface RenderResult {
  /** JPEG, base64. The port promises JPEG; see the adapter for why that is enforced. */
  imageBase64: string;
}

/**
 * How long one provider may take over one render, in milliseconds.
 *
 * Part of the port because the app's own wait is built on it: two providers at
 * this ceiling, plus the ledger around them, must finish inside the app's
 * render timeout (`apps/mobile/src/api/client.ts`). A Worker still waiting when
 * the phone gives up has already spent the credit, and whether the refund ever
 * runs is then up to the runtime. A render that is going to succeed comes back
 * well inside this; one that has not is aborted as transient, so the fallback
 * gets its turn.
 */
export const RENDER_TIMEOUT_MS = 35_000;

/** The one thing this product actually sells. */
export interface HairRendererPort {
  render(request: RenderRequest): Promise<RenderResult>;
}
