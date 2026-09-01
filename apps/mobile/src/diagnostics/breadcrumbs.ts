import type { Breadcrumb } from '@loxa/shared';

/**
 * The last few things that happened before an error.
 *
 * A stack says where the app was; a trail says how it got there. "opened
 * camera, took photo, started render, crashed" is most of a bug report, and
 * none of it is recoverable from the stack alone.
 *
 * Pure and synchronous on purpose: it is written to on the crash path, where
 * there is no time for storage and no guarantee of another tick.
 */

/**
 * Twenty, matching the wire contract's cap.
 *
 * Long enough to cover a screen's worth of actions, short enough that the whole
 * trail is readable at a glance in a table row. Older entries fall off the
 * front — the recent ones are the ones that explain the error.
 */
const MAX = 20;

/**
 * A label is a fixed string the app chose, never interpolated user content.
 *
 * That is the rule that keeps a filename, a search term or a photo out of the
 * trail without needing to scrub it: there is nothing to scrub if nothing
 * variable is ever put in.
 */
const trail: { at: number; label: string }[] = [];

export function pushBreadcrumb(label: string, at: number = Date.now()): void {
  trail.push({ at, label: label.slice(0, 64) });
  if (trail.length > MAX) trail.shift();
}

/**
 * The trail as the wire wants it: milliseconds *before* `now`, most recent last.
 *
 * Relative because a report is written on one launch and sent on the next, and
 * a device with a wrong clock would otherwise hand us a trail that sorts
 * wrongly against its own error.
 */
export function readBreadcrumbs(now: number = Date.now()): Breadcrumb[] {
  return trail.map(({ at, label }) => ({ at: Math.max(0, now - at), label }));
}

/** Test and reset seam. The trail is module state for the process lifetime. */
export function clearBreadcrumbs(): void {
  trail.length = 0;
}
