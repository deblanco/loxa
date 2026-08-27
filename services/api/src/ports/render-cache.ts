/**
 * Rendered images, by request.
 *
 * A hit is a credit not spent — pressing "Again" on the same photo with the
 * same style and colour is the same picture, and charging twice for it would be
 * charging for a network retry.
 */
export interface RenderCachePort {
  get(key: string): Promise<string | null>;
  put(key: string, imageBase64: string): Promise<void>;
}
