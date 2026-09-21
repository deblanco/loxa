import { PhotoRejectedError, RendererUnavailableError } from '../../core/errors';
import type { FaceAnalystPort } from '../../ports/face-analyst';
import { extractJson, readDraft } from '../json-answer';
import { buildSuitabilityPrompt } from '../suitability-prompt';

/**
 * The fallback analyst: a vision model on OpenRouter's chat endpoint.
 *
 * Vertex was the obvious candidate and cannot do it — `loxa-506814` is
 * entitled to the image model and to nothing else, so every text model id
 * answers 404 there. This is the same posture the renderer already takes for a
 * different reason: somebody else's quota, held for the times ours will not
 * answer.
 *
 * Text rather than images, so the endpoint is `/chat/completions` and not the
 * `/images` one the renderer posts to. A few hundred output tokens is cents,
 * which is why this fallback does not move the margin arithmetic the way the
 * render path's would.
 */
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export interface OpenRouterAnalystConfig {
  apiKey: string;
  /** A full OpenRouter slug for a model that can see a photograph. */
  model: string;
}

interface ChatResponse {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  error?: { code?: number | string; message?: string };
}

export function openRouterFaceAnalyst(config: OpenRouterAnalystConfig): FaceAnalystPort {
  return {
    async analyse(request) {
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
            // Asked for as JSON as well as described as JSON in the prompt:
            // a model that honours neither still reaches `extractJson`.
            response_format: { type: 'json_object' },
            // Ask OpenRouter to route only to providers that do not collect or train on
            // requests. This is the one lever we have on what happens to a face on
            // the far side of this call, and the privacy page points people to each
            // provider's own terms rather than asserting them. Checked live against
            // both models on 2026-09-21: accepted, and still served by Google.
            provider: { data_collection: 'deny' },
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: buildSuitabilityPrompt(request.catalogue, request.limit) },
                  ...request.photosBase64.map((data) => ({
                    type: 'image_url' as const,
                    image_url: { url: `data:image/jpeg;base64,${data}` },
                  })),
                ],
              },
            ],
          }),
        });
      } catch (err) {
        throw new RendererUnavailableError(
          err instanceof Error ? err.message : 'the analysis fallback could not be reached',
          true,
        );
      }

      if (!response.ok) {
        // 403 is OpenRouter's moderation refusing the photograph, which is a
        // verdict on it rather than an outage — the same split the renderer
        // makes, and the reason it does not fall through to anybody else.
        if (response.status === 403) {
          throw new PhotoRejectedError('the analysis provider refused the photo');
        }
        throw new RendererUnavailableError(
          `analysis fallback returned ${response.status}: ${(await response.text()).slice(0, 200)}`,
          response.status === 429 || response.status >= 500,
        );
      }

      let body: ChatResponse;
      try {
        body = (await response.json()) as ChatResponse;
      } catch {
        throw new RendererUnavailableError('analysis fallback returned unreadable JSON', true);
      }

      if (body.error) {
        throw new RendererUnavailableError(
          `analysis fallback: ${body.error.message ?? 'unknown error'}`,
          true,
        );
      }

      const draft = readDraft(extractJson(body.choices?.[0]?.message?.content ?? ''));
      if (!draft) {
        throw new RendererUnavailableError('analysis fallback answered with something else', true);
      }

      return draft;
    },
  };
}
