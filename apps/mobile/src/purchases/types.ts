/**
 * What the app needs from a store, and nothing more.
 *
 * The same port/adapter split the Worker uses, mirrored on the client: the
 * paywall screen talks to this interface, so it can be driven by a fake in a
 * test and by StoreKit on a device without knowing which it has.
 */
/**
 * What the weekly costs this reader, in this storefront, today.
 *
 * Not a wire shape, so it lives here rather than in `contracts.ts` — the Worker
 * reads entitlements and never a price.
 */
export interface WeeklyPricing {
  /** The recurring price as the store spells it: `$9.99`, `9,99 €`, `¥1,500`. */
  price: string;
  /**
   * The first week's price, or null when this customer cannot have it.
   *
   * Null is the honest answer for somebody who has subscribed before: the offer
   * exists on the product either way, and printing it to a person the App Store
   * will charge full price would be a lie told at the moment of payment.
   */
  introPrice: string | null;
}

export interface PurchasesPort {
  /** Called once at launch, with the anonymous device id as the customer id. */
  configure(deviceId: string): Promise<void>;
  /** Buy the weekly subscription. Resolves false if the user backs out. */
  buyWeekly(): Promise<boolean>;
  /** What to print on a screen that shows a price. Null if the store is mute. */
  weeklyPricing(): Promise<WeeklyPricing | null>;
  /** Buy one $0.99 photo. Resolves with the transaction ids to sync, or null. */
  buySinglePhoto(): Promise<string[] | null>;
  /** Restore, for a reinstall or a new device. Returns ids worth syncing. */
  restore(): Promise<string[]>;
}
