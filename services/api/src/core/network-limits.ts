import { FREE_CREDITS } from '@loxa/shared';
import type { CreditLedgerPort } from '../ports/credit-ledger';
import type { ReportQuotaPort } from '../ports/report-quota';
import { networkKey } from './cache-key';
import { NetworkRateError } from './errors';
import { rollForward } from './rules';

/**
 * The limits on a client network, as opposed to a device.
 *
 * The device id is the one thing a client chooses for itself, so a limit keyed
 * on it stops nobody: a script mints a fresh id per request and every one of
 * them arrives with a free photo. What the client cannot choose is the address
 * it connects from, so that is what is counted here.
 *
 * `network` is null when the request carried no address. Cloudflare always
 * sets one in production, so that is local development and the test runner;
 * it skips the limits rather than pooling every such caller into one bucket.
 *
 * Both counters are the KV quota's approximate kind: two requests racing may
 * between them go a few over. What they bound is a bill, not a balance.
 */

/**
 * New device ids one network may bring in a day.
 *
 * Ten is a household, or an office that installed the app on the same
 * afternoon. It is far below what farming free photos needs, and the cost of
 * being wrong is small and one-sided: the eleventh person on a network loses
 * the free photo, not the app.
 */
export const NEW_DEVICES_PER_NETWORK_PER_DAY = 10;

/**
 * Renders and analyses one network may ask for in a minute.
 *
 * Coarse on purpose. A render takes seconds, so one person cannot approach it;
 * an office behind one address can, and sixty is well past that. It is there
 * for the script, and everything under it is left alone.
 */
export const REQUESTS_PER_NETWORK_PER_MINUTE = 60;

export interface AdmitDeviceDeps {
  ledger: CreditLedgerPort;
  /** Counts new device ids per network per day. */
  quota: ReportQuotaPort;
  now: () => Date;
}

export interface LimitRequestsDeps {
  /** Counts requests per network per minute. */
  quota: ReportQuotaPort;
  now: () => Date;
}

/**
 * Let a device id in, and decide whether it arrives with its free photo.
 *
 * A device is new until its row has been written, which is `week === null`:
 * every write core makes rolls the week forward first. Its first sighting is
 * counted against its network, and past the cap it is **admitted anyway, with
 * the free credit already spent** — written into the row now, so the balance
 * the app shows, the analysis gate and the render all agree from the first
 * request. The alternative, refusing the id or showing it a credit that then
 * 402s mid-flow, is a worse surprise for the eleventh person in an office; this
 * way they meet the paywall, which is where they were going to end up anyway.
 *
 * Only the free pool is touched. A subscription and a bought credit are pools
 * of their own and are spent exactly as before, so paying is never limited by
 * this. It is also why this is not "cap the number of ids": every id keeps
 * working, and only the one thing that was being farmed is withheld.
 *
 * The row is written with a swap against what was read, so of several
 * simultaneous first requests for one id exactly one registers it and the rest
 * find it done. The loser has counted a second slot for the same id, which
 * costs the network one of its ten in a rare race and is not worth a lock.
 *
 * The network is hashed, and the device id never reaches the counter: the
 * privacy policy promises no identifier is stored beside another.
 */
export async function admitDevice(
  deviceId: string,
  network: string | null,
  deps: AdmitDeviceDeps,
): Promise<void> {
  if (network === null) return;

  const state = await deps.ledger.read(deviceId);
  if (state.week !== null) return;

  const now = deps.now();
  const granted = await deps.quota.consume(
    await networkKey(network),
    1,
    NEW_DEVICES_PER_NETWORK_PER_DAY,
    now,
  );

  const rolled = rollForward(state, now);
  await deps.ledger.compareAndWrite(
    deviceId,
    state,
    granted > 0 ? rolled : { ...rolled, freeUsed: Math.max(rolled.freeUsed, FREE_CREDITS) },
  );
}

/** Refuse a network that is asking for renders or analyses faster than any person does. */
export async function limitRequests(
  network: string | null,
  deps: LimitRequestsDeps,
): Promise<void> {
  if (network === null) return;

  const granted = await deps.quota.consume(
    await networkKey(network),
    1,
    REQUESTS_PER_NETWORK_PER_MINUTE,
    deps.now(),
  );
  if (granted === 0) throw new NetworkRateError();
}
