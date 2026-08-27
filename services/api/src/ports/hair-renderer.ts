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

/** The one thing this product actually sells. */
export interface HairRendererPort {
  render(request: RenderRequest): Promise<RenderResult>;
}
