export interface SuitabilityRequest {
  /** One or two photos of the same face. Base64 JPEG, no data: prefix, in the order they were taken. */
  photosBase64: readonly string[];
  /**
   * The cuts the model is allowed to name.
   *
   * Ids and names only. `HairStyle.prompt` stays in this Worker — it does not
   * cross to the app and it does not cross to a provider either.
   */
  catalogue: readonly { id: string; name: string }[];
  /** How many cuts to ask for. The model may return fewer, and often should. */
  limit: number;
}

/**
 * What a provider said, before anybody believed it.
 *
 * Deliberately plain strings rather than `FaceShape` and catalogue ids: this is
 * third-party output, and typing it as the domain's own vocabulary would make
 * the type system vouch for a model. `core/suitability.ts` is what turns this
 * into the typed thing, or refuses it.
 */
export interface SuitabilityDraft {
  faceShape: string;
  cuts: readonly { styleId: string; reason: string }[];
}

/**
 * Reading a face and naming the cuts that suit it.
 *
 * A separate port from `HairRendererPort` rather than a widening of it: that
 * one is image-typed in both directions and promises JPEG, and the one thing
 * this product sells should not have an optional-text union in front of it.
 */
export interface FaceAnalystPort {
  analyse(request: SuitabilityRequest): Promise<SuitabilityDraft>;
}
