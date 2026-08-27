import { z } from 'zod';
import { HAIR_STYLE_IDS } from './styles';
import { HAIR_COLOR_IDS } from './colors';
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

export const styleIdSchema = z.enum(HAIR_STYLE_IDS as [string, ...string[]]);
export const colorIdSchema = z.enum(HAIR_COLOR_IDS as [string, ...string[]]);
export const planIdSchema = z.enum(PLAN_IDS);

// --- POST /v1/tryon ---------------------------------------------------------

export const tryOnRequestSchema = z.object({
  imageBase64: imageBase64Schema,
  styleId: styleIdSchema,
  colorId: colorIdSchema,
});
export type TryOnRequest = z.infer<typeof tryOnRequestSchema>;

export const tryOnResponseSchema = z.object({
  /** JPEG, base64, 2:3. The client writes it straight to `${id}.jpg`. */
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
