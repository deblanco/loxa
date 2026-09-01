import Constants from 'expo-constants';
import i18next from 'i18next';
import { AppState, Platform } from 'react-native';
import type { ErrorUtils as ErrorUtilsType } from 'react-native';
import type { DiagnosticKind } from '@loxa/shared';
import { sendDiagnostics } from '@/api/client';
import { pushBreadcrumb } from './breadcrumbs';
import { drain, enqueue } from './queue';
import { toReport, type ReportEnv } from './report';

/**
 * Everything that catches an error and everything that sends one.
 *
 * The app had none of this: no boundary, no global handler, no rejection
 * tracking. A render that failed for any reason other than running out of
 * credits bounced the user back to the preview screen in silence, and we never
 * heard about it.
 *
 * The rule that shapes this file: **collecting must never be able to break the
 * app it is watching.** Every function here swallows its own failures, none of
 * them throws, and the send path is never on the crash path.
 */

/** The screen the user is on, for the report. Set from the root layout. */
let route: string | undefined;

export function noteRoute(next: string): void {
  route = next;
  pushBreadcrumb(`route ${next}`);
}

/**
 * What the app knows about itself, read fresh each time.
 *
 * The language can change while the app is running, and a report from a session
 * that was in German should say so. `expo-constants` was already a dependency
 * and imported nowhere; this is the first thing to read it.
 */
function currentEnv(): ReportEnv {
  return {
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    osVersion: `${Platform.OS} ${String(Platform.Version)}`,
    locale: i18next.language || 'unknown',
    route,
  };
}

async function capture(err: unknown, kind: DiagnosticKind): Promise<void> {
  try {
    await enqueue(toReport(err, kind, currentEnv()));
  } catch {
    // A reporter that throws is worse than one that misses.
  }
}

/**
 * Send whatever is queued.
 *
 * Called behind the splash on launch and on return to the foreground — never
 * from a handler. A report is written on one launch and sent on a later one
 * precisely because the launch that produced it may not survive to send it.
 */
export async function flushDiagnostics(): Promise<void> {
  try {
    const reports = await drain();
    if (reports.length === 0) return;

    await sendDiagnostics(reports);
  } catch {
    // The queue was already cleared, so these reports are gone. That is the
    // intended trade: see `queue.ts`. If the app is still broken it will report
    // again, and a device with no network never accumulates a batch it retries
    // forever.
  }
}

/**
 * A failure the app already caught, and usually already told the user about.
 *
 * The most useful of the four kinds and the only one that was completely
 * invisible before — a handled error leaves no trace anywhere by definition.
 * The app is alive here, so this one sends rather than waiting for a relaunch.
 */
export function reportHandled(err: unknown, where: string): void {
  pushBreadcrumb(`failed ${where}`);
  void capture(err, 'handled').then(() => flushDiagnostics());
}

/** A React subtree threw and the boundary caught it. */
export function reportRenderError(err: unknown): void {
  void capture(err, 'render_error').then(() => flushDiagnostics());
}

/**
 * Arm the two global handlers. Called at module scope from the root layout, so
 * it runs before any component mounts.
 */
export function installDiagnostics(): void {
  const errorUtils = (globalThis as unknown as { ErrorUtils?: ErrorUtilsType }).ErrorUtils;

  if (errorUtils) {
    // Chained, never replaced. The default handler is what shows the red box in
    // development and what ends the process in production; swallowing it would
    // trade every crash we can already see for the ones we cannot.
    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((err, isFatal) => {
      void capture(err, 'crash');
      previous(err, isFatal);
    });
  }

  // React Native enables Hermes' rejection tracker only under __DEV__
  // (`Libraries/Core/polyfillPromise.js`), so in a release build an unhandled
  // rejection goes nowhere at all. This turns it on for production and leaves
  // development alone, where RN's own tracker owns it and surfaces rejections
  // in LogBox — which is more useful to a developer than anything we would do.
  if (!__DEV__) {
    const hermes = (globalThis as unknown as {
      HermesInternal?: {
        enablePromiseRejectionTracker?: (options: {
          allRejections: boolean;
          onUnhandled: (id: number, rejection: unknown) => void;
        }) => void;
      };
    }).HermesInternal;

    hermes?.enablePromiseRejectionTracker?.({
      allRejections: true,
      onUnhandled: (_id, rejection) => {
        void capture(rejection, 'unhandled_rejection');
      },
    });
  }

  // Coming back to the foreground is the other moment there is time to send:
  // an app that crashed, was reopened and left running would otherwise hold its
  // report until the launch after next.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void flushDiagnostics();
  });
}
