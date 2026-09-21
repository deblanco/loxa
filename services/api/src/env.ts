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
   * The self-hosted analysis endpoint: where it is, which model, and the token.
   *
   * All three or none. A base URL with no token is a 401 on the one path
   * nobody exercises until it is needed, which is the same argument that keeps
   * GOOGLE_PROJECT_ID and GOOGLE_SA_KEY moving together.
   *
   * Unset is supported: Gemini answers every analysis instead, which costs
   * latency and the text quota rather than correctness. `wrangler secret put
   * OPENCODE_TOKEN`, or .dev.vars locally — it is a Worker secret and never
   * reaches the app.
   */
  OPENCODE_BASE_URL?: string;
  OPENCODE_MODEL?: string;
  OPENCODE_TOKEN?: string;

  /**
   * The OpenRouter slug for the model that reads a face, on the same key the
   * render fallback uses.
   *
   * This is the analysis fallback, and it is OpenRouter rather than Vertex for
   * a blunt reason: `loxa-506814` is entitled to the image model and to nothing
   * else, so every Gemini *text* id answers 404 there — measured, not assumed.
   * A few hundred output tokens is cents, so unlike the render fallback this
   * one does not move the margin arithmetic.
   *
   * Unset means the self-hosted endpoint has no fallback, which is supported.
   * **Unset together with the OPENCODE_* three is not**: with no provider at all
   * the analysis route answers 502 for everybody. That is where the parallel
   * with OPENROUTER_API_KEY ends — that key costs availability, and these
   * together cost the feature.
   */
  OPENROUTER_ANALYSIS_MODEL?: string;

  /**
   * A Vertex text model, if this project ever gets one.
   *
   * Kept because the adapter is written and tested and the day the project is
   * granted a text model this is one variable away from being the fallback
   * again — and a direct relationship with Google beats a reseller. Today it
   * must stay unset: there is no such model to point it at.
   *
   * **Never `IMAGE_MODEL`.** That quota is about two requests a minute for the
   * whole project and it is what renders are sold against; an analysis sharing
   * it would take a photo somebody paid for.
   */
  ANALYSIS_TEXT_MODEL?: string;

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
   * RevenueCat's own id for the $0.99 photo — `prod...`.
   *
   * **Without it no photo purchase is ever verified, and no credit is granted.**
   * The v2 purchase object's `product_id` is RevenueCat's internal id, not the
   * store identifier: a customer who has just bought `loxa_single_photo_099`
   * comes back as `prod4c50338ed7`, so matching on the store id alone never
   * matches and `verifyPurchase` answers a confident, silent no.
   *
   * The store id stays accepted alongside it — one of the two shapes is what
   * every API revision has returned so far, and accepting both is what
   * `REVENUECAT_WEEKLY_ENTITLEMENT_ID` already does for entitlements.
   *
   * From the product's "REST API Identifier" in the RevenueCat dashboard. A
   * path-free constant, not a secret, so it lives in wrangler.toml.
   */
  REVENUECAT_SINGLE_PHOTO_PRODUCT_ID?: string;

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
