import { EMPTY_STATE, type CreditState } from '../../core/rules';
import type { CreditLedgerPort } from '../../ports/credit-ledger';

interface Row {
  week: string | null;
  week_used: number;
  free_used: number;
  extra_credits: number;
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
        .prepare('SELECT week, week_used, free_used, extra_credits FROM device_credits WHERE device_id = ?')
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
      };
    },

    async write(deviceId, state: CreditState) {
      // Upsert rather than insert-then-update: the first spend of a device's
      // life would otherwise need two round trips and a race between them.
      await db
        .prepare(
          `INSERT INTO device_credits (device_id, week, week_used, free_used, extra_credits)
           VALUES (?1, ?2, ?3, ?4, ?5)
           ON CONFLICT(device_id) DO UPDATE SET
             week = ?2, week_used = ?3, free_used = ?4, extra_credits = ?5`,
        )
        .bind(deviceId, state.week, state.weekUsed, state.freeUsed, state.extraCredits)
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
