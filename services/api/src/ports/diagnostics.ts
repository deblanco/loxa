import type { DiagnosticReport } from '@loxa/shared';

/**
 * Where a report of something that broke on a phone goes.
 *
 * Like `UsageStatsPort`, nothing depends on the answer: the use case does not
 * branch on it, and a store that will not write must never turn into a failure
 * the user can see. A device telling us it crashed and being told the telling
 * failed is the one outcome with no value to anybody.
 *
 * The port takes the whole batch rather than one report at a time. The device
 * flushes its queue in a single request, and a per-report round trip to D1
 * would make a phone that crashed twenty times twenty times as expensive to
 * hear from.
 */
export interface DiagnosticsPort {
  /**
   * Write a batch, and prune whatever has aged out.
   *
   * `at` is the server's clock, not the device's — a phone with a wrong clock
   * is exactly the kind of phone that reports errors, and retention has to be
   * something we can reason about.
   */
  record(reports: DiagnosticReport[], at: Date): Promise<void>;
}
