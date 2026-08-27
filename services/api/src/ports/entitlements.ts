import type { PlanId } from '@loxa/shared';

/** What the store says this device is entitled to. */
export interface EntitlementsPort {
  planFor(deviceId: string): Promise<PlanId>;
  /**
   * Confirm a consumable purchase actually happened.
   *
   * The app sends transaction ids and we ask the store, rather than believing
   * the phone: an unverified id is a free credit for anyone who reads the
   * network traffic once.
   */
  verifyPurchase(deviceId: string, transactionId: string): Promise<boolean>;
}
