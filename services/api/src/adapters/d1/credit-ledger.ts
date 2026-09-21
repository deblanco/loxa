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

    async compareAndWrite(deviceId, expected, next) {
      // One statement, so the compare and the swap cannot be pulled apart. The
      // upsert's WHERE is what makes it a compare: a row that no longer holds
      // `expected` is left alone and reports zero changes. `IS` rather than `=`
      // because `week` and `last_plan` are NULL for a row nobody has spent from.
      //
      // A device with no row takes the INSERT arm, which is the first write of
      // its life. That arm has no compare, and needs none: it is only reached
      // when the row is absent, which is `EMPTY_STATE`, the one thing `read`
      // reports for it. Two requests racing to create it collide on the primary
      // key, and the loser meets the WHERE against a row that is no longer empty.
      const result = await db
        .prepare(
          `INSERT INTO device_credits (device_id, week, week_used, free_used, extra_credits, last_plan)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)
           ON CONFLICT(device_id) DO UPDATE SET
             week = ?2, week_used = ?3, free_used = ?4, extra_credits = ?5, last_plan = ?6
           WHERE week IS ?7 AND week_used = ?8 AND free_used = ?9
             AND extra_credits = ?10 AND last_plan IS ?11`,
        )
        .bind(
          deviceId,
          next.week,
          next.weekUsed,
          next.freeUsed,
          next.extraCredits,
          next.lastPlan ?? null,
          expected.week,
          expected.weekUsed,
          expected.freeUsed,
          expected.extraCredits,
          expected.lastPlan ?? null,
        )
        .run();

      return (result.meta.changes ?? 0) > 0;
    },

    async grantCredit(deviceId, transactionId, at) {
      // `INSERT OR IGNORE` plus the row count is how a first sighting is told
      // from a replay, in one statement — a SELECT-then-INSERT would let two
      // concurrent syncs of the same purchase both see nothing and both grant.
      //
      // The credit rides in the same batch, which D1 runs as one transaction on
      // one connection, so `changes()` in the second statement is the first's
      // answer: a replay grants nothing, and a first sighting cannot be recorded
      // without its credit. It is `extra_credits + 1` in SQL rather than a value
      // computed from a read, which is what lets a spend land in between.
      const [grant] = await db.batch([
        db
          .prepare(
            'INSERT OR IGNORE INTO credit_grant (transaction_id, device_id, granted_at) VALUES (?, ?, ?)',
          )
          .bind(transactionId, deviceId, at.toISOString()),
        db
          .prepare(
            `INSERT INTO device_credits (device_id, extra_credits)
             SELECT ?1, 1 WHERE changes() > 0
             ON CONFLICT(device_id) DO UPDATE SET extra_credits = extra_credits + 1`,
          )
          .bind(deviceId),
      ]);

      return (grant?.meta.changes ?? 0) > 0;
    },
  };
}
