import { PhotoRejectedError, RendererUnavailableError } from '../../core/errors';
import type { HairRendererPort } from '../../ports/hair-renderer';
import { buildHairPrompt } from '../hair-prompt';

/**
 * The same model, reached through somebody else's quota.
 *
 * OpenRouter serves `google/gemini-3.1-flash-lite-image` from its own Google AI
 * Studio and Vertex accounts. Neither is `loxa-506814`, which is the entire
 * point: when our project's per-minute limit refuses a render, this one has not
 * been asked yet. It is the fallback and never the primary — we hold the direct
 * relationship with Google and should use it while it answers.
 *
 * Billed at $30 per million image-output tokens, and this model is measured at
 * 1120 of them per image: $0.034, the same as calling Vertex ourselves. The
 * margin arithmetic in wrangler.toml does not move when a render comes from
 * here.
 */

/** Nano Banana 2 Lite's own image endpoint, not the chat-completions one. */
const ENDPOINT = 'https://openrouter.ai/api/v1/images';

/** The same portrait frame as Vertex, for the same reason: every screen is 9:16. */
const ASPECT_RATIO = '9:16';

/**
 * Asked for, not hoped for.
 *
 * The port promises JPEG and the client writes the bytes straight to
 * `${id}.jpg`. OpenRouter takes an explicit output format, so this is one of
 * the few contracts that can be stated in the request rather than checked in
 * the reply — and it is checked in the reply as well.
 */
const OUTPUT_FORMAT = 'jpeg';
const OUTPUT_MIME = 'image/jpeg';

export interface OpenRouterRendererConfig {
  apiKey: string;
  /** The full OpenRouter slug, e.g. `google/gemini-3.1-flash-lite-image`. */
  model: string;
}

interface ImagesResponse {
  data?: { b64_json?: string; media_type?: string }[];
  error?: { code?: number | string; message?: string };
}

export function openRouterHairRenderer(config: OpenRouterRendererConfig): HairRendererPort {
  return {
    async render(request) {
      let response: Response;

      try {
        response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${config.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: config.model,
            prompt: buildHairPrompt(request),
            n: 1,
            aspect_ratio: ASPECT_RATIO,
            output_format: OUTPUT_FORMAT,
            // The user's photo. OpenRouter takes a data URL here where Vertex
            // takes inlineData; the bytes are identical.
            input_references: [
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${request.imageBase64}` },
              },
            ],
          }),
        });
      } catch (err) {
        throw new RendererUnavailableError(
          err instanceof Error ? err.message : 'the fallback image model could not be reached',
          true,
        );
      }

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 200);

        // 403 is OpenRouter's moderation verdict on the input, which is the
        // same thing Vertex calls a blockReason: about this photo, and the user
        // can do something about it. Everything else at this level is not.
        if (response.status === 403) {
          throw new PhotoRejectedError(`openrouter moderation: ${detail}`);
        }

        throw new RendererUnavailableError(
          `fallback image model returned ${response.status}: ${detail}`,
          response.status === 429 || response.status >= 500,
        );
      }

      let body: ImagesResponse;
      try {
        body = (await response.json()) as ImagesResponse;
      } catch {
        throw new RendererUnavailableError('fallback image model returned unreadable JSON');
      }

      const image = body.data?.[0];

      if (!image?.b64_json) {
        // A 200 with an error body, or a 200 with nothing in it. OpenRouter
        // reports an upstream refusal this way rather than with a status.
        throw new RendererUnavailableError(
          `fallback image model returned no image${body.error?.message ? `: ${body.error.message}` : ''}`,
        );
      }

      /**
       * JPEG or nothing, the same as Vertex.
       *
       * `output_format: 'jpeg'` above asks for it, but the answer is what
       * counts: a PNG written to `${id}.jpg` is a file lying about itself
       * rather than a visible failure, and it would reach a device.
       */
      if (image.media_type && image.media_type !== OUTPUT_MIME) {
        throw new RendererUnavailableError(
          `fallback image model returned ${image.media_type}, expected ${OUTPUT_MIME}`,
        );
      }

      return { imageBase64: image.b64_json };
    },
  };
}
