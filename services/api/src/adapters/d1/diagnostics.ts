import type { DiagnosticReport } from '@loxa/shared';
import type { DiagnosticsPort } from '../../ports/diagnostics';

/**
 * Error reports on D1, on the same database as the ledger.
 *
 * Same reasoning as `usage-stats`: a second binding would be a second thing to
 * provision, keep in step and lose, and this table is bounded by the prune
 * below rather than by traffic.
 */

/**
 * Thirty days, the same window as the render cache and the same number the
 * privacy policy already commits to. The three are one decision: a report that
 * outlived the page describing it is the page being wrong.
 */
const RETENTION_DAYS = 30;

export function d1Diagnostics(db: D1Database): DiagnosticsPort {
  return {
    async record(reports, at) {
      const cutoff = new Date(at.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const reportedAt = at.toISOString();

      const insert = db.prepare(
        `INSERT INTO diagnostic_report
           (id, kind, message, stack, route, app_version, os_version, locale,
            breadcrumbs, reported_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
      );

      // One batch: the inserts and the prune go to D1 together, so a phone that
      // crashed twenty times is one round trip rather than twenty-one.
      await db.batch([
        ...reports.map((report) =>
          insert.bind(
            crypto.randomUUID(),
            report.kind,
            report.message,
            report.stack ?? null,
            report.route ?? null,
            report.appVersion,
            report.osVersion,
            report.locale,
            JSON.stringify(report.breadcrumbs),
            reportedAt,
          ),
        ),
        // Retention is a delete on write because this database has no cron —
        // the same shape of decision as the weekly credit reset being a
        // comparison on read rather than a scheduled job.
        db.prepare(`DELETE FROM diagnostic_report WHERE reported_at < ?1`).bind(cutoff),
      ]);
    },
  };
}
