import { PhotoRejectedError, RendererUnavailableError } from '../../core/errors';
import type { FaceAnalystPort } from '../../ports/face-analyst';
import { extractJson, readDraft } from '../json-answer';
import { buildSuitabilityPrompt } from '../suitability-prompt';
import { accessToken, type ServiceAccountCredentials } from './auth';

/**
 * The fallback analyst: Gemini, asked for words rather than a picture.
 *
 * A separate file from `hair-renderer.ts` although it posts to the same host
 * and signs with the same token, because almost everything else differs. That
 * one asks for `['TEXT', 'IMAGE']` and an aspect ratio, and treats a reply with
 * no picture in it as a failure; this one asks for JSON, sends up to two
 * photos, and a picture would be the failure.
 *
 * **It must never be pointed at `IMAGE_MODEL`.** The image model's quota is
 * about two requests a minute for the whole project, and renders are what that
 * quota is for — an analysis running on it would take a photo somebody paid
 * for. `ANALYSIS_TEXT_MODEL` is its own base model with its own limit, which is
 * why it is configured separately rather than derived. A test asserts the URL.
 */
const LOCATION = 'global';

export interface VertexAnalystConfig {
  credentials: ServiceAccountCredentials;
  projectId: string;
  model: string;
}

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

export function vertexFaceAnalyst(config: VertexAnalystConfig): FaceAnalystPort {
  const endpoint =
    `https://aiplatform.googleapis.com/v1/projects/${config.projectId}` +
    `/locations/${LOCATION}/publishers/google/models/${config.model}:generateContent`;

  return {
    async analyse(request) {
      let token: string;
      try {
        token = await accessToken(config.credentials);
      } catch (err) {
        throw new RendererUnavailableError(
          err instanceof Error ? err.message : 'could not authenticate to Vertex',
        );
      }

      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: buildSuitabilityPrompt(request.catalogue, request.limit) },
                  ...request.photosBase64.map((data) => ({
                    inlineData: { mimeType: 'image/jpeg', data },
                  })),
                ],
              },
            ],
            generationConfig: {
              // Words, and specifically JSON. No `responseModalities` and no
              // `imageConfig`: those two are what make the renderer's call an
              // image call, and asking for an image here would bill an image.
              responseMimeType: 'application/json',
            },
          }),
        });
      } catch (err) {
        throw new RendererUnavailableError(
          err instanceof Error ? err.message : 'the analysis model could not be reached',
          true,
        );
      }

      if (!response.ok) {
        throw new RendererUnavailableError(
          `analysis model returned ${response.status}: ${(await response.text()).slice(0, 200)}`,
          response.status === 429 || response.status >= 500,
        );
      }

      let body: GenerateContentResponse;
      try {
        body = (await response.json()) as GenerateContentResponse;
      } catch {
        throw new RendererUnavailableError('analysis model returned unreadable JSON', true);
      }

      // A block is a verdict on the photograph, and the user can do something
      // about it — take another one. It does not fall through to anybody else,
      // because the same model elsewhere returns the same verdict.
      if (body.promptFeedback?.blockReason) {
        throw new PhotoRejectedError(body.promptFeedback.blockReason);
      }

      const candidate = body.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'IMAGE_SAFETY') {
        throw new PhotoRejectedError(candidate.finishReason);
      }

      const text = candidate?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
      const draft = readDraft(extractJson(text));
      if (!draft) {
        throw new RendererUnavailableError('analysis model answered with something else', true);
      }

      return draft;
    },
  };
}
