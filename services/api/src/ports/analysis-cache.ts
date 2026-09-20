/**
 * Answers about a face, by the photographs that produced them.
 *
 * Not `RenderCachePort`, which holds pictures: a hit there is a credit not
 * spent, and a hit here is a model call not made — this route never spends
 * anything. The two also want different lifetimes, and putting a TTL parameter
 * on the port the render route depends on would be changing that route's file
 * for a feature it does not have.
 */
export interface AnalysisCachePort {
  get(key: string): Promise<string | null>;
  put(key: string, json: string): Promise<void>;
}
