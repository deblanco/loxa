/**
 * How often each cut and colour is chosen.
 *
 * The one port core calls that nothing depends on: the answer is not used to
 * decide anything, and a failure here must never reach the user. It exists so
 * that "which styles should we render art for next" has an answer other than a
 * guess — see `schema.sql` for why it is a counter rather than a log.
 */
export interface UsageStatsPort {
  /**
   * Count one use of a pair.
   *
   * `cached` separates a model call we paid for from a re-open of a picture
   * that already existed. Both are use; only one is spend.
   */
  record(styleId: string, colorId: string, cached: boolean): Promise<void>;
}
