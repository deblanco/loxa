import { PhotoRejectedError, RendererUnavailableError } from '../../core/errors';
import type { HairRendererPort } from '../../ports/hair-renderer';
import { buildHairPrompt } from '../hair-prompt';
import { accessToken, type ServiceAccountCredentials } from './auth';

/**
 * The renderer, with a model behind it.
 *
 * Gemini 3.1 Flash-Lite Image — "Nano Banana 2 Lite" — chosen on price among
 * the models that can actually be shown the photo. Measured at 1120 output
 * tokens per image, $0.034. The cheaper Imagen 4 Fast at $0.02 is text-to-image
 * only: it cannot see this face, and a stranger with the right haircut is the
 * one thing this product must not return.
 */

/**
 * `global` rather than a region, and this is a price decision.
 *
 * Google lists this model's per-token rate under the global endpoint; several
 * regional endpoints carry a surcharge. Nothing about the call needs pinning to
 * a region, so it does not pay for one.
 */
const LOCATION = 'global';

/**
 * 2:3 — the `1024 × 1536` the prototype's preview plate and result screen are
 * both built around.
 *
 * Asked for here rather than in the prompt because prompt-described framing is
 * unreliable and every attempt is billed. The token count, and so the cost, is
 * identical across aspect ratios; only the pixel dimensions move.
 */
const ASPECT_RATIO = '2:3';

export interface VertexRendererConfig {
  credentials: ServiceAccountCredentials;
  projectId: string;
  model: string;
}

interface GenerateContentResponse {
  candidates?: {
    content?: { parts?: { text?: string; inlineData?: { mimeType?: string; data?: string } }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

export function vertexHairRenderer(config: VertexRendererConfig): HairRendererPort {
  const endpoint =
    `https://aiplatform.googleapis.com/v1/projects/${config.projectId}` +
    `/locations/${LOCATION}/publishers/google/models/${config.model}:generateContent`;

  return {
    async render(request) {
      let response: Response;
      let token: string;

      try {
        token = await accessToken(config.credentials);
      } catch (err) {
        // A bad or revoked key is not a model outage, but it reaches the user
        // as the same 502 — there is nothing they can do about either.
        throw new RendererUnavailableError(
          err instanceof Error ? err.message : 'could not authenticate to Vertex',
        );
      }

      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: buildHairPrompt(request) },
                  { inlineData: { mimeType: 'image/jpeg', data: request.imageBase64 } },
                ],
              },
            ],
            generationConfig: {
              // Both modalities: the model rejects a request that asks for an
              // image without leaving itself room to say anything.
              responseModalities: ['TEXT', 'IMAGE'],
              imageConfig: { aspectRatio: ASPECT_RATIO },
            },
          }),
        });
      } catch (err) {
        throw new RendererUnavailableError(
          err instanceof Error ? err.message : 'the image model could not be reached',
        );
      }

      if (!response.ok) {
        // 429 here is Vertex's own per-minute quota, not the user's credit
        // balance. It still surfaces as unavailable: core refunds on any throw,
        // so the credit survives either way.
        throw new RendererUnavailableError(
          `image model returned ${response.status}: ${(await response.text()).slice(0, 200)}`,
        );
      }

      let body: GenerateContentResponse;
      try {
        body = (await response.json()) as GenerateContentResponse;
      } catch {
        throw new RendererUnavailableError('image model returned unreadable JSON');
      }

      // A block is about *this photo*, and the user can do something about it —
      // take another one. That is a different error from the model being down,
      // and the app says something different for each.
      if (body.promptFeedback?.blockReason) {
        throw new PhotoRejectedError(body.promptFeedback.blockReason);
      }

      const candidate = body.candidates?.[0];
      const image = candidate?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData;

      if (!image?.data) {
        // A safety stop on the candidate, a refusal, or a reply that is all
        // text and no picture. SAFETY is the user's photo; the rest is ours.
        if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'IMAGE_SAFETY') {
          throw new PhotoRejectedError(candidate.finishReason);
        }
        throw new RendererUnavailableError(
          `image model returned no image (finishReason: ${candidate?.finishReason ?? 'none'})`,
        );
      }

      /**
       * JPEG or nothing.
       *
       * The port promises JPEG and the client writes the bytes straight to
       * `${id}.jpg`, so a PNG would be a file lying about itself rather than a
       * visible failure. Measured: this model answers image/jpeg. If that ever
       * changes it should break here, loudly, and refund — not reach a device.
       */
      if (image.mimeType && image.mimeType !== 'image/jpeg') {
        throw new RendererUnavailableError(
          `image model returned ${image.mimeType}, expected image/jpeg`,
        );
      }

      return { imageBase64: image.data };
    },
  };
}
