import type { PlanId } from '@loxa/shared';
import { EMPTY_STATE, type CreditState } from '../../core/rules';
import type { CreditLedgerPort } from '../../ports/credit-ledger';

interface Row {
  week: string | null;
  week_used: number;
  free_used: number;
  extra_credits: number;
  last_plan: PlanId | null;
}

/**
 * The credit ledger on D1.
 *
 * Deliberately dumb: it moves rows, and knows nothing about weeks, pools or
 * plans. Every one of those decisions is arithmetic in `core/rules.ts`, which
 * is what lets the interesting behaviour be tested without a binding.
 */
export function d1CreditLedger(db: D1Database): CreditLedgerPort {
  return {
    async read(deviceId) {
      const row = await db
        .prepare(
          'SELECT week, week_used, free_used, extra_credits, last_plan FROM device_credits WHERE device_id = ?',
        )
        .bind(deviceId)
        .first<Row>();

      // A device nobody has seen is not an error — it is every user's first
      // launch, and it has the same credits as a device with an all-zero row.
      if (!row) return EMPTY_STATE;

      return {
        week: row.week,
        weekUsed: row.week_used,
        freeUsed: row.free_used,
        extraCredits: row.extra_credits,
        // Null for every row written before the column existed, which reads as
        // "plan unknown" and costs one harmless reset the next time the device
        // is seen as a subscriber.
        lastPlan: row.last_plan,
      };
    },

    async write(deviceId, state: CreditState) {
      // Upsert rather than insert-then-update: the first spend of a device's
      // life would otherwise need two round trips and a race between them.
      await db
        .prepare(
          `INSERT INTO device_credits (device_id, week, week_used, free_used, extra_credits, last_plan)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)
           ON CONFLICT(device_id) DO UPDATE SET
             week = ?2, week_used = ?3, free_used = ?4, extra_credits = ?5, last_plan = ?6`,
        )
        .bind(
          deviceId,
          state.week,
          state.weekUsed,
          state.freeUsed,
          state.extraCredits,
          // D1 rejects undefined outright, and a caller building a row by hand
          // is the likeliest source of one.
          state.lastPlan ?? null,
        )
        .run();
    },

    async recordGrant(deviceId, transactionId, at) {
      // `INSERT OR IGNORE` plus the row count is how a first sighting is told
      // from a replay, in one statement — a SELECT-then-INSERT would let two
      // concurrent syncs of the same purchase both see nothing and both grant.
      const result = await db
        .prepare(
          'INSERT OR IGNORE INTO credit_grant (transaction_id, device_id, granted_at) VALUES (?, ?, ?)',
        )
        .bind(transactionId, deviceId, at.toISOString())
        .run();

      return (result.meta.changes ?? 0) > 0;
    },
  };
}
