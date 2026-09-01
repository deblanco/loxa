import AsyncStorage from '@react-native-async-storage/async-storage';
import { diagnosticReportSchema, type DiagnosticReport } from '@loxa/shared';

/**
 * Reports waiting to be sent, held on disk.
 *
 * **This is the whole reason the module is a queue and not a `fetch`.** A crash
 * takes the app down before a request could finish, so a reporter that posted
 * directly would lose exactly the errors worth having. Every report is written
 * here first and sent on a later launch, when there is time.
 *
 * Everything fails quietly. This runs on the crash path, and a diagnostics
 * store that throws would turn one bug into two.
 */
const KEY = 'loxa.diagnostics.v1';

/**
 * Twenty, the same bound as the wire contract, so a full queue is one request.
 *
 * A crash loop can produce more than twenty before the app is next opened. The
 * oldest are kept and the newest dropped: the first error in a cascade is
 * usually the one that caused the rest, and the twentieth repeat says nothing
 * the first did not.
 */
const MAX_QUEUED = 20;

async function read(): Promise<DiagnosticReport[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Each report is validated individually so one corrupt entry — an older
    // shape, a half-written file — costs that entry rather than the batch.
    return parsed.flatMap((entry) => {
      const result = diagnosticReportSchema.safeParse(entry);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
}

/** Add one, dropping the newest rather than the oldest once full. */
export async function enqueue(report: DiagnosticReport): Promise<void> {
  try {
    const queued = await read();
    if (queued.length >= MAX_QUEUED) return;

    await AsyncStorage.setItem(KEY, JSON.stringify([...queued, report]));
  } catch {
    // Nothing to do and nowhere to say it.
  }
}

/**
 * Take everything and forget it.
 *
 * Cleared before the send rather than after: a report that fails to upload is
 * dropped, and that is the intended trade. Keeping it would mean a device with
 * no network accumulating the same batch forever and retrying it on every
 * launch — and if the app is still broken, it will report again.
 */
export async function drain(): Promise<DiagnosticReport[]> {
  const queued = await read();
  if (queued.length === 0) return [];

  await AsyncStorage.removeItem(KEY).catch(() => {});
  return queued;
}
