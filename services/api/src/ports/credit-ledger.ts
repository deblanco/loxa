import type { CreditState } from '../core/rules';

/**
 * The credit ledger, as core needs it.
 *
 * Deliberately dumb: read a row, write a row, record a grant. Every decision
 * about which pool a credit comes from is arithmetic in `core/rules.ts`, so the
 * D1 adapter can be replaced by a Map in a test without moving a single rule.
 */
export interface CreditLedgerPort {
  read(deviceId: string): Promise<CreditState>;
  write(deviceId: string, state: CreditState): Promise<void>;
  /**
   * Record a consumable purchase, once.
   *
   * Returns true only the first time an id is seen. The app re-syncs its
   * purchases on every launch and after every restore, so the same id arrives
   * many times and must be worth one credit in total.
   */
  recordGrant(deviceId: string, transactionId: string, at: Date): Promise<boolean>;
}
