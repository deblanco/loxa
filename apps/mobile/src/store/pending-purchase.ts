import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncPurchases } from '@/api/client';
import { reportHandled } from '@/diagnostics';
import { isStale, syncUntilGranted, type PendingPurchase } from '@/purchases/settle';

/**
 * The $0.99 purchase that has not become a credit yet, if there is one.
 *
 * See `purchases/settle.ts` for why it is written down. AsyncStorage rather
 * than the keychain: losing it on a reinstall costs an automatic retry, and
 * Restore still recovers the credit.
 */
const KEY = 'loxa.pendingPurchase.v1';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function read(): Promise<PendingPurchase | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingPurchase) : null;
  } catch {
    return null;
  }
}

/** Before the first sync, so a sync that never comes back still leaves a trace. */
export async function rememberPurchase(transactionIds: string[]): Promise<void> {
  const pending: PendingPurchase = { transactionIds, at: new Date().toISOString() };
  await AsyncStorage.setItem(KEY, JSON.stringify(pending));
}

export async function forgetPurchase(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}

/**
 * Ask the Worker to grant the pending purchase, if there is one.
 *
 * True once it has been granted, and it is then forgotten. False when there is
 * nothing pending or the Worker granted nothing yet — it stays, and the next
 * launch or foreground asks again. Throws when the last attempt could not reach
 * the Worker; background callers swallow that, the paywall reports it.
 */
export async function settlePendingPurchase(attempts = 1): Promise<boolean> {
  const pending = await read();
  if (!pending) return false;

  if (isStale(pending, new Date())) {
    await forgetPurchase();
    reportHandled(new Error(`purchase from ${pending.at} never granted`), 'pendingPurchase.stale');
    return false;
  }

  const granted = await syncUntilGranted(
    () => syncPurchases(pending.transactionIds),
    sleep,
    attempts,
  );
  if (!granted) return false;

  await forgetPurchase();
  return true;
}
