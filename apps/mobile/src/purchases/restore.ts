import { syncPurchases } from '@/api/client';
import { reportHandled } from '@/diagnostics';
import { purchases } from './index';

/** What a restore turned up, in the terms a screen needs to report it. */
export type RestoreOutcome = 'restored' | 'nothing' | 'failed';

/**
 * Restore, and tell the Worker about anything worth a credit.
 *
 * Three screens offer this and each has to say something afterwards, so the
 * outcome is a value rather than a toast raised in here: the profile flashes a
 * line, and the two paywalls have their own places to put it.
 *
 * The three answers are genuinely different and used to be one. Restoring on a
 * device that never bought anything is not a success, and saying "Purchases
 * restored" to somebody who has just watched nothing happen is the kind of
 * thing that produces a support email. A store that threw is different again —
 * that one is worth offering another go.
 *
 * `nothing` is not the same as "not a subscriber": consumables are what come
 * back as transaction ids, and a weekly subscription restores as an entitlement
 * that the Worker reads separately. So the refresh happens on every path that
 * did not throw, and the balance the Worker returns is the real answer.
 */
export async function restoreAndSync(): Promise<RestoreOutcome> {
  try {
    const transactionIds = await purchases().restore();
    if (transactionIds.length) {
      await syncPurchases(transactionIds);
      return 'restored';
    }
    return 'nothing';
  } catch (err) {
    // The outcome the caller shows is unchanged; the difference is that we now
    // hear about it. A restore that fails is how somebody who has already paid
    // discovers they cannot use what they bought.
    reportHandled(err, 'restoreAndSync');
    return 'failed';
  }
}
