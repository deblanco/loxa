import { z } from 'zod';
import { PLAN_IDS } from './entitlements';

/**
 * Every shape that crosses the wire, in one file, owned by neither side.
 *
 * The Worker parses requests with these and the app parses responses with them,
 * so a field that changes breaks a type on both sides in the same commit. That
 * is the whole point: a contract that only one end knows about is a bug waiting
 * for a release cycle.
 */

/**
 * A photo, base64, without a data: prefix.
 *
 * 8MB of base64 is roughly 6MB of JPEG, which is larger than anything the app
 * sends — it downscales to 1024px before upload — and well inside the Worker's
 * request limit. The ceiling is here rather than in the Worker so the app can
 * refuse locally instead of spending a round trip to be told no.
 */
const MAX_IMAGE_BASE64 = 8 * 1024 * 1024;

export const imageBase64Schema = z
  .string()
  .min(1, 'the photo is empty')
  .max(MAX_IMAGE_BASE64, 'the photo is too large')
  .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'the photo is not base64');

/**
 * A catalogue id, as a string rather than as an enum of the ids we ship with.
 *
 * It used to be `z.enum(HAIR_STYLE_IDS)`, and that was two problems. The app
 * parses responses with this file, so the enum dragged `styles.ts` and
 * `colors.ts` — every render prompt included — into the app bundle. And the
 * catalogue the app draws is now served rather than compiled, so a wire schema
 * that lists the ids is precisely the coupling that change removes.
 *
 * Nothing is unvalidated as a result: `core/try-on.ts` resolves both ids
 * against the catalogue before it does anything else, and an id it cannot find
 * is an `UnknownStyleError` and a 400. The check moved one layer in, to the
 * side that owns the prompts.
 */
const catalogueIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/, 'not a catalogue id');

export const styleIdSchema = catalogueIdSchema;
export const colorIdSchema = catalogueIdSchema;
export const planIdSchema = z.enum(PLAN_IDS);

// --- POST /v1/tryon ---------------------------------------------------------

export const tryOnRequestSchema = z.object({
  imageBase64: imageBase64Schema,
  styleId: styleIdSchema,
  colorId: colorIdSchema,
});
export type TryOnRequest = z.infer<typeof tryOnRequestSchema>;

export const tryOnResponseSchema = z.object({
  /** JPEG, base64, 9:16. The client writes it straight to `${id}.jpg`. */
  imageBase64: z.string().min(1),
  /** After the spend, so the app can update the chip without a second call. */
  creditsLeft: z.number().int().min(0),
  /**
   * True when this came out of the cache and no credit was spent.
   *
   * Surfaced rather than hidden: a retry of the identical request is free, and
   * the app should not animate a spend that did not happen.
   */
  cached: z.boolean(),
});
export type TryOnResponse = z.infer<typeof tryOnResponseSchema>;

// --- GET /v1/credits --------------------------------------------------------

export const creditsResponseSchema = z.object({
  creditsLeft: z.number().int().min(0),
  /** The weekly allowance for this plan. 0 on free. */
  cap: z.number().int().min(0),
  plan: planIdSchema,
  /** ISO timestamp of the next Monday midnight UTC. */
  resetsAt: z.string(),
});
export type CreditsResponse = z.infer<typeof creditsResponseSchema>;

// --- POST /v1/purchases/sync ------------------------------------------------

/**
 * The app reporting consumable purchases it has seen.
 *
 * Ids, not receipts: the Worker asks RevenueCat what actually happened rather
 * than believing the phone. Sending an id that was never bought grants nothing,
 * and sending one twice grants once — `credit_grant` is keyed on it.
 */
export const purchaseSyncRequestSchema = z.object({
  transactionIds: z.array(z.string().min(1)).min(1).max(50),
});
export type PurchaseSyncRequest = z.infer<typeof purchaseSyncRequestSchema>;

export const purchaseSyncResponseSchema = z.object({
  /** How many credits this call added. Zero is a normal answer. */
  granted: z.number().int().min(0),
  creditsLeft: z.number().int().min(0),
});
export type PurchaseSyncResponse = z.infer<typeof purchaseSyncResponseSchema>;

// --- GET /v1/catalogue ------------------------------------------------------

/**
 * The published catalogue, as the app draws it.
 *
 * This is a projection of the catalogue in `styles.ts` and `colors.ts`, not a
 * copy of it: `prompt` is missing from both halves and never crosses the wire.
 * The Worker owns the prompts because the Worker makes the render, and a
 * fragment the app could edit is a fragment that can rewrite a paid call.
 *
 * What it does carry is what the strip and the plate need, plus the preview
 * keys. Only styles and colours that have *rendered art* appear, which is the
 * reason this is served at all — the generator has finished 15 of 24 cuts, and
 * a compiled catalogue has no way to say so.
 */

/** Preview keys, relative to the assets bucket. Never absolute URLs — see below. */
const previewKeySchema = z.string().min(1).max(256);

export const catalogueStyleSchema = z.object({
  id: catalogueIdSchema,
  name: z.string().min(1),
  /**
   * Strip tiles, one key per rendered model slot.
   *
   * May be empty, and usually is: 45 of the 48 tiles do not exist yet. The
   * strip falls back to a hero rather than dropping the style, so a missing
   * tile costs a crop, not a cut.
   */
  tiles: z.array(previewKeySchema),
  /** The colours rendered for this style, in catalogue order. Never empty. */
  colors: z
    .array(
      z.object({
        id: catalogueIdSchema,
        /** Hero keys for this style-and-colour, one per rendered model slot. */
        heroes: z.array(previewKeySchema).min(1),
      }),
    )
    .min(1),
});
export type CatalogueStyle = z.infer<typeof catalogueStyleSchema>;

export const catalogueColorSchema = z.object({
  id: catalogueIdSchema,
  name: z.string().min(1),
  /** The swatch, and only the swatch. What the model is asked for stays server-side. */
  hex: z.string().regex(/^#[0-9a-f]{6}$/, 'not a lowercase six-digit hex'),
});
export type CatalogueColor = z.infer<typeof catalogueColorSchema>;

export const catalogueResponseSchema = z
  .object({
    /**
     * Bumped only for a breaking shape change.
     *
     * The app refuses a version it does not know rather than guessing, and a
     * cached manifest from an older shape is discarded instead of migrated.
     */
    version: z.literal(1),
    styles: z.array(catalogueStyleSchema).min(1),
    /**
     * Names and swatches, once each, referenced by id from the per-style lists.
     * Listing them here rather than inside every style keeps the payload flat
     * and makes a rename one edit instead of twenty-four.
     */
    colors: z.array(catalogueColorSchema).min(1),
    /** What the preview screen opens on. Both must appear above. */
    defaults: z.object({ styleId: catalogueIdSchema, colorId: catalogueIdSchema }),
    /**
     * Where the head sits in each hero, as fractions of the image height.
     *
     * `top` is the crown, `bottom` the underside of the head. The app fits that
     * band into the plate: centred on it, and scaled down when the band would
     * not otherwise fit. That is what stops a big style — an afro, a high
     * ponytail — being cropped at the crown on a short plate.
     *
     * It lives here, in the manifest, rather than in the pictures. The renders
     * are 9:16 and the plate is `flex: 1`, so the plate is never quite the same
     * shape and shows a different band of the image on every screen size: a
     * frame baked into a JPEG can only be right for one of them. Keeping it as
     * data also means re-framing the catalogue is an upload rather than a
     * release, and the original files are never touched.
     *
     * Hand-editable, deliberately. Nudging one cut is two numbers here.
     *
     * Optional, and absent means "centre the picture" — an older manifest still
     * renders, just less tidily.
     */
    focus: z
      .record(
        previewKeySchema,
        z.object({ top: z.number().min(0).max(1), bottom: z.number().min(0).max(1) }),
      )
      .optional(),
  })
  .superRefine((manifest, ctx) => {
    // Referential integrity, checked here so that both the Worker serving a
    // manifest and the app caching one refuse the same broken file. A default
    // that is not in the list boots the app onto a style that does not exist,
    // and a colour id with no entry renders a swatch with no colour — both are
    // silent, and both survive a 24h cache.
    const styleIds = new Set(manifest.styles.map((style) => style.id));
    const colorIds = new Set(manifest.colors.map((color) => color.id));

    if (!styleIds.has(manifest.defaults.styleId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['defaults', 'styleId'],
        message: 'the default style is not in the catalogue',
      });
    }
    if (!colorIds.has(manifest.defaults.colorId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['defaults', 'colorId'],
        message: 'the default colour is not in the catalogue',
      });
    }

    manifest.styles.forEach((style, index) => {
      for (const entry of style.colors) {
        if (!colorIds.has(entry.id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['styles', index, 'colors'],
            message: `${style.id} lists a colour that is not in the catalogue: ${entry.id}`,
          });
        }
      }
    });
  });
export type CatalogueResponse = z.infer<typeof catalogueResponseSchema>;

// --- Errors -----------------------------------------------------------------

/**
 * Every non-2xx body from the Worker.
 *
 * `code` is for the app to branch on — `out_of_credits` opens the paywall —
 * and `message` is for a human reading a log, never for display. The app writes
 * its own copy: the design system owns the words.
 */
export const apiErrorSchema = z.object({
  code: z.enum([
    'bad_request',
    'out_of_credits',
    'photo_rejected',
    'renderer_unavailable',
    'internal',
  ]),
  message: z.string(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiErrorCode = ApiError['code'];
