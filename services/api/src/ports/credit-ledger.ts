import type { CreditState } from '../core/rules';

/**
 * The credit ledger, as core needs it.
 *
 * Deliberately dumb: read a row, swap a row, grant a purchase. Every decision
 * about which pool a credit comes from is arithmetic in `core/rules.ts`, so the
 * D1 adapter can be replaced by a Map in a test without moving a single rule.
 */
export interface CreditLedgerPort {
  read(deviceId: string): Promise<CreditState>;
  /**
   * Overwrite the row, whatever it holds now.
   *
   * **Not for read-modify-write.** Two requests for one device read the same
   * row and each write back their own answer, so the second erases the first —
   * which is how one credit used to buy two renders. Anything computed from a
   * `read` goes through `compareAndWrite`.
   */
  write(deviceId: string, state: CreditState): Promise<void>;
  /**
   * Replace `expected` with `next`, only if the row still holds `expected`.
   *
   * Returns false, having written nothing, when another request got there
   * first; the caller reads again and re-decides. A device with no row holds
   * `EMPTY_STATE`, so the first write of its life is an insert-if-absent.
   */
  compareAndWrite(deviceId: string, expected: CreditState, next: CreditState): Promise<boolean>;
  /**
   * Honour a consumable purchase, once: record the transaction and add the
   * credit to `extraCredits` as one step.
   *
   * Returns true only the first time an id is seen. The app syncs after every
   * purchase and every restore, and again on launch and on foreground while a
   * purchase has not yet settled, so the same id arrives many times and must be
   * worth one credit in total.
   *
   * The credit is added in the store rather than computed from a read, so a
   * spend landing at the same moment cannot cost the user the credit they just
   * paid for.
   */
  grantCredit(deviceId: string, transactionId: string, at: Date): Promise<boolean>;
}
