/**
 * What the app needs from a store, and nothing more.
 *
 * The same port/adapter split the Worker uses, mirrored on the client: the
 * paywall screen talks to this interface, so it can be driven by a fake in a
 * test and by StoreKit on a device without knowing which it has.
 */
/**
 * What Loxa costs this reader, in this storefront, today.
 *
 * Not a wire shape, so it lives here rather than in `contracts.ts` — the Worker
 * reads entitlements and never a price.
 *
 * Both products are in one shape because every screen that prints a price
 * prints both of them, and two round trips to the store for two numbers that
 * are always shown together is a second chance to fail.
 */
export interface Pricing {
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
  /**
   * The one-off photo, as the store spells it.
   *
   * Printed beside the weekly on the out-of-credits sheet and on the profile.
   * It used to be the shipped `$0.99` label on both, which is the right number
   * only in the United States — a euro-zone reader was shown a dollar price for
   * a product the sheet then charged them 1,19 € for.
   */
  singlePhoto: string;
}

export interface PurchasesPort {
  /** Called once at launch, with the anonymous device id as the customer id. */
  configure(deviceId: string): Promise<void>;
  /** Buy the weekly subscription. Resolves false if the user backs out. */
  buyWeekly(): Promise<boolean>;
  /** What to print on a screen that shows a price. Null if the store is mute. */
  pricing(): Promise<Pricing | null>;
  /** Buy one $0.99 photo. Resolves with the transaction ids to sync, or null. */
  buySinglePhoto(): Promise<string[] | null>;
  /** Restore, for a reinstall or a new device. Returns ids worth syncing. */
  restore(): Promise<string[]>;
  /**
   * Where this customer's subscription is actually managed, or null.
   *
   * The store knows and we do not. A sandbox subscription — every TestFlight
   * purchase is one — does not appear in the production subscriptions list, so
   * the hardcoded App Store URL sends a tester to a page their subscription is
   * not on. Null when there is no active subscription, which is the caller's
   * cue to fall back.
   */
  managementUrl(): Promise<string | null>;
  /**
   * RevenueCat's Customer Center, if it can be shown.
   *
   * The sheet with the active plan on it, plus restore, change plan, cancel and
   * request a refund — the things somebody who presses "Manage" is actually
   * looking for, in one place and inside the app. Resolves false when it cannot
   * be presented, which is the caller's cue to fall back to a URL.
   */
  presentCustomerCenter(): Promise<boolean>;
}
