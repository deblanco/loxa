export interface Env {
  /** The credit ledger. `device_credits` and `credit_grant`; see schema.sql. */
  DB: D1Database;
  /** Rendered images, keyed on a hash of photo + style + colour. */
  RESULTS_CACHE: KVNamespace;
  /** Style thumbnails, served rather than bundled into the app. */
  ASSETS: R2Bucket;

  /** The Google Cloud project that owns the Vertex endpoint. */
  GOOGLE_PROJECT_ID: string;
  /** The image model. gemini-3.1-flash-lite-image. */
  IMAGE_MODEL: string;
  /**
   * Secret: a Google service account key file, verbatim, JSON and all.
   *
   * Set with `wrangler secret put GOOGLE_SA_KEY < key.json` (or .dev.vars
   * locally). The account behind it holds `roles/aiplatform.user` and nothing
   * else — it can call the model and cannot read a bucket, list an identity, or
   * see the billing account.
   *
   * Moves with GOOGLE_PROJECT_ID or not at all: a key from one project against
   * another project's id fails at the token endpoint, and that reaches the user
   * as the model being unavailable rather than as an auth error.
   */
  GOOGLE_SA_KEY: string;

  /**
   * Secret: an OpenRouter API key, and the whole of the fallback switch.
   *
   * Vertex answers every render it can. When it answers 429 — this project is
   * measured at roughly one image a minute, and the model is `global` only, so
   * there is no region to escape to — or 5xx, or cannot be reached, the same
   * model is asked again through OpenRouter, on quota that is not ours.
   *
   * Undefined means one provider and today's behaviour, which is a supported
   * state. Unlike the RevenueCat stub, missing this key costs availability, not
   * correctness: no render is wrong because it was not set, some just fail that
   * would otherwise have succeeded.
   *
   * `wrangler secret put OPENROUTER_API_KEY`, or .dev.vars locally. Like
   * GOOGLE_SA_KEY it is a Worker secret and never reaches the app.
   */
  OPENROUTER_API_KEY?: string;

  /**
   * The same model, spelled the way OpenRouter spells it.
   *
   * `google/gemini-3.1-flash-lite-image` to IMAGE_MODEL's
   * `gemini-3.1-flash-lite-image`. Written out rather than derived from
   * IMAGE_MODEL by prefixing: the two catalogues are not obliged to stay in
   * step, and a slug that has silently drifted is a 404 on the fallback path,
   * which is the path nobody exercises until it is needed.
   *
   * Without it the fallback stays off even if the key is set — an unnamed model
   * cannot be called.
   */
  OPENROUTER_IMAGE_MODEL?: string;

  /**
   * Secret: the RevenueCat `sk_` key, for looking a customer up server-side.
   *
   * Not the key the app ships with — that one is publishable and can only buy
   * things on behalf of the customer holding the phone. This one can read every
   * customer's entitlements, which is why it lives here and never leaves.
   *
   * Undefined falls back to the stub, where nobody is a subscriber. That is the
   * honest failure: a deployment that cannot verify a purchase must not assume
   * one, and assuming it is how a paywall becomes free AI spend.
   */
  REVENUECAT_SECRET_KEY?: string;

  /** The RevenueCat project — `proj...`, from the dashboard URL. A path segment, not a secret. */
  REVENUECAT_PROJECT_ID?: string;

  /**
   * RevenueCat's own id for the weekly entitlement — `entl...`.
   *
   * Optional. The v2 answer may name an entitlement by its lookup key
   * ("weekly", which packages/shared already owns) or by this id, and which one
   * appears has moved between API revisions. Setting it makes both shapes match.
   */
  REVENUECAT_WEEKLY_ENTITLEMENT_ID?: string;

  /**
   * Development only: lets a request ask to be treated as a subscriber.
   *
   * Set to "1" in .dev.vars, which is git-ignored and never deployed — the same
   * thing that keeps GOOGLE_SA_KEY out of the app. Undefined in production, and
   * an undefined switch ignores the header entirely, so the real adapter
   * decides. Never add this to wrangler.toml or to `wrangler secret put`.
   */
  DEV_PREMIUM?: string;
}
