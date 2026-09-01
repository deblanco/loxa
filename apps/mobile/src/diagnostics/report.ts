import { redactImageData, type DiagnosticKind, type DiagnosticReport } from '@loxa/shared';
import { readBreadcrumbs } from './breadcrumbs';

/**
 * An error, turned into the thing the Worker stores.
 *
 * Pure, and takes its environment as an argument rather than reading it, which
 * is what lets the redaction below be tested in Node with no Expo loaded — the
 * same rule that keeps `format.ts`, `selection.ts` and `face/verdict.ts`
 * testable. It returns data, never a sentence: nothing here is shown to anyone.
 */

/** Matches the wire contract, which is where the real ceilings are documented. */
const MAX_MESSAGE = 500;
const MAX_STACK = 4000;

/**
 * Take the photograph out, before it ever reaches the network.
 *
 * The rule itself is in `@loxa/shared` because the Worker applies it a second
 * time before writing; see `redact.ts` there. This side is what keeps a photo
 * off the wire at all.
 *
 * It runs **before** truncation, and the order matters: truncating first could
 * cut a long run down to something that no longer matches, leaving five hundred
 * characters of somebody's photo in the column.
 */
export const redact = redactImageData;

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** What the app knows about itself. Passed in so this module reads nothing. */
export interface ReportEnv {
  appVersion: string;
  osVersion: string;
  locale: string;
  route?: string;
}

/**
 * The message, from something that may not be an `Error` at all.
 *
 * A thrown string, a rejected object and a genuine `Error` all arrive here, and
 * the contract requires a non-empty message — so there is a floor rather than a
 * possibility of an empty one.
 */
function messageOf(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  if (err && typeof err === 'object') {
    const maybe = (err as { message?: unknown }).message;
    if (typeof maybe === 'string' && maybe) return maybe;
  }
  return 'unknown error';
}

export function toReport(
  err: unknown,
  kind: DiagnosticKind,
  env: ReportEnv,
  now: number = Date.now(),
): DiagnosticReport {
  const stack = err instanceof Error && err.stack ? truncate(redact(err.stack), MAX_STACK) : undefined;

  return {
    kind,
    message: truncate(redact(messageOf(err)), MAX_MESSAGE),
    ...(stack ? { stack } : {}),
    ...(env.route ? { route: env.route.slice(0, 64) } : {}),
    appVersion: env.appVersion.slice(0, 32),
    osVersion: env.osVersion.slice(0, 32),
    locale: env.locale.slice(0, 16),
    breadcrumbs: readBreadcrumbs(now),
  };
}
