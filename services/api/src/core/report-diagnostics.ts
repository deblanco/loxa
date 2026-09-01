import { redactImageData, type DiagnosticReport, type DiagnosticsResponse } from '@loxa/shared';
import type { DiagnosticsPort } from '../ports/diagnostics';
import type { ReportQuotaPort } from '../ports/report-quota';

/**
 * Take a batch of error reports from a phone.
 *
 * The whole use case is a quota check and a write, and it is in core rather
 * than in the handler because the number below is a product decision: how much
 * we are willing to hear from one device in a day.
 */

/**
 * Fifty reports per device per day.
 *
 * A working install files none. An install that is genuinely broken files a
 * handful, and fifty is far past the point where the fifty-first tells us
 * anything the first ten did not. It exists to bound the table, not to ration
 * the truth.
 */
export const DAILY_REPORT_LIMIT = 50;

export interface ReportDiagnosticsDeps {
  diagnostics: DiagnosticsPort;
  quota: ReportQuotaPort;
  now: () => Date;
}

/**
 * Take the photograph out again, on our side.
 *
 * The app already does this before sending, so in the normal case this changes
 * nothing. It is here because "no photo is stored on our server" is a promise
 * about *this* table, and a promise that holds only while every client is ours
 * and current is not one worth printing on a privacy page. An old build, a
 * bug, or anything that is not our app at all reaches this line too.
 */
function scrub(report: DiagnosticReport): DiagnosticReport {
  return {
    ...report,
    message: redactImageData(report.message),
    ...(report.stack ? { stack: redactImageData(report.stack) } : {}),
  };
}

export async function reportDiagnostics(
  deviceId: string,
  reports: DiagnosticReport[],
  deps: ReportDiagnosticsDeps,
): Promise<DiagnosticsResponse> {
  const at = deps.now();

  const allowed = await deps.quota.consume(deviceId, reports.length, DAILY_REPORT_LIMIT, at);
  // Over the cap is a 200 with nothing written, not an error. The app has
  // already dropped its queue by the time it reads this, and telling a phone
  // that is having a bad day that its complaint was rejected helps nobody.
  if (allowed <= 0) return { accepted: 0 };

  // The oldest are kept: the first error is usually the one that caused the
  // nineteen after it.
  const accepted = reports.slice(0, allowed).map(scrub);
  await deps.diagnostics.record(accepted, at);

  return { accepted: accepted.length };
}
