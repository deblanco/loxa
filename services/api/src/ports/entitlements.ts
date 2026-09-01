import type { PlanId } from '@loxa/shared';

/** What the store says this device is entitled to. */
export interface EntitlementsPort {
  planFor(deviceId: string): Promise<PlanId>;
  /**
   * Every photo this device has bought and not had refunded, by the store's own
   * id for each purchase.
   *
   * **The phone is not asked which purchases it made.** It used to be: it sent
   * transaction ids and we confirmed them one by one. That broke the moment the
   * SDK started handing the app a synthetic id — `o1_BYAPcVJ4nNRG…` — while the
   * server knew the same purchase as `otpAap466fd98b…` against Apple's
   * `2000001230022808`. Nothing matched, every purchase failed to verify, and
   * because failing closed is the correct answer to "cannot verify", it did so
   * in silence while taking the money.
   *
   * Asking the store to enumerate is immune to that. The ids never leave the
   * server, so no format they take can be mismatched against a client's, and
   * the answer is the same whether the app is syncing after a purchase or
   * after a restore.
   */
  photoPurchases(deviceId: string): Promise<readonly string[]>;
}
