import type { RestoreResult } from './types';

/**
 * What to do about a restore, decided from what it found.
 *
 * `sync` is consumables: their credits exist only once the Worker has been told
 * the transaction ids. `restored` is a subscription and nothing to hand over —
 * the Worker reads the entitlement itself, so the screens only need to say so
 * and refresh the balance. `nothing` is the one case where saying "nothing to
 * restore" is true.
 *
 * A subscriber-only restore used to land in `nothing`, because a subscription
 * has no transaction id and the ids were all this looked at. That told somebody
 * who had just been given their subscription back that there was nothing to
 * give.
 */
export type RestoreVerdict = 'sync' | 'restored' | 'nothing';

export function restoreVerdict(found: RestoreResult): RestoreVerdict {
  if (found.transactionIds.length > 0) return 'sync';
  return found.subscribed ? 'restored' : 'nothing';
}
