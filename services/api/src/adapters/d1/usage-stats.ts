import type { UsageStatsPort } from '../../ports/usage-stats';

/**
 * The style counters on D1.
 *
 * One upsert per use, on the same database as the ledger — this is a write we
 * are adding to a request that already costs $0.034 of model, so it is not the
 * expensive part, and a second binding to keep in step would be.
 */
export function d1UsageStats(db: D1Database): UsageStatsPort {
  return {
    async record(styleId, colorId, cached) {
      // Interpolated because a column name cannot be bound — and safe because
      // it is chosen from a boolean here, not taken from the request. The ids
      // themselves are bound, as always.
      const column = cached ? 'replays' : 'renders';

      // Upsert rather than insert-then-update: the first time a pair is ever
      // picked would otherwise need two round trips and a race between them.
      await db
        .prepare(
          `INSERT INTO style_use (style_id, color_id, renders, replays)
           VALUES (?1, ?2, ?3, ?4)
           ON CONFLICT(style_id, color_id) DO UPDATE SET ${column} = ${column} + 1`,
        )
        .bind(styleId, colorId, cached ? 0 : 1, cached ? 1 : 0)
        .run();
    },
  };
}
