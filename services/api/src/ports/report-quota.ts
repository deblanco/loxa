/**
 * How many error reports one device is still allowed to file today.
 *
 * `POST /v1/diagnostics` is unmetered — a report of a failure must not cost a
 * credit — and it writes to D1, so something has to stop one phone in a crash
 * loop from filling the table. This is that something.
 *
 * The device id reaches this port and stops here. It keys a counter and is
 * never written next to a report; see `schema.sql` for why the row carries no
 * identifier, and the privacy policy for the sentence that promises it.
 */
export interface ReportQuotaPort {
  /**
   * Claim up to `wanted` reports for this device, and return how many were
   * granted — `0` once the day's allowance is spent.
   *
   * `limit` is passed in rather than known here: how much we are willing to
   * hear from one device in a day is a product rule, and product rules live in
   * core. This side only counts.
   *
   * Not a ledger, and deliberately not transactional: two flushes racing may
   * between them file a handful over the limit. A rate limit that is
   * approximately right is worth far less machinery than one that is exactly
   * right, and the thing being protected is a table's size.
   */
  consume(deviceId: string, wanted: number, limit: number, at: Date): Promise<number>;
}
