/**
 * What the app needs from a store, and nothing more.
 *
 * The same port/adapter split the Worker uses, mirrored on the client: the
 * paywall screen talks to this interface, so it can be driven by a fake in a
 * test and by StoreKit on a device without knowing which it has.
 */
export interface PurchasesPort {
  /** Called once at launch, with the anonymous device id as the customer id. */
  configure(deviceId: string): Promise<void>;
  /** Buy the weekly subscription. Resolves false if the user backs out. */
  buyWeekly(): Promise<boolean>;
  /** Buy one $0.99 photo. Resolves with the transaction ids to sync, or null. */
  buySinglePhoto(): Promise<string[] | null>;
  /** Restore, for a reinstall or a new device. Returns ids worth syncing. */
  restore(): Promise<string[]>;
}
