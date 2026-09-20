import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { RendererUnavailableError } from '../../core/errors';
import type { FaceAnalystPort } from '../../ports/face-analyst';
import { extractJson, readDraft } from '../json-answer';
import { buildSuitabilityPrompt } from '../suitability-prompt';

/**
 * The primary analyst: a self-hosted endpoint speaking the OpenAI Responses
 * API, reached through the Vercel AI SDK.
 *
 * It is primary because it is ours and it is free, which keeps the Vertex text
 * quota for the times this machine is not answering. That is also its risk:
 * unlike Google and OpenRouter it has no contract behind it, so the deployment
 * rules — TLS, the token as a Worker secret, request-body logging off, nothing
 * retained — are the whole of its trustworthiness, and they live in the
 * privacy policy rather than in this file.
 *
 * `fetch` is handed to the provider explicitly. The SDK would otherwise capture
 * the global at construction, and the test suite replaces that global per test;
 * without this the suite would reach the network.
 *
 * The SDK validates the reply against OpenAI's own Responses schema, which is
 * stricter than the endpoint it is pointed at may be — it requires, for
 * instance, an `annotations` array on every text part. A self-hosted server
 * that omits a field OpenAI always sends will therefore fail validation here
 * rather than at the parse below. That is survivable because of the rule in the
 * next paragraph: it reads as "this box is not answering properly", and Google
 * gets asked. If the endpoint turns out to be close-but-not-identical, this is
 * the line to replace with a plain fetch.
 *
 * Failures here are **transient by default**, which is the opposite of the
 * image renderer's posture and deliberate: an image call carries a bill and a
 * safety verdict that a second provider would only repeat, whereas this is a
 * few hundred text tokens with no verdict attached. A box in somebody's house
 * answering badly is precisely the "ask Google instead" case.
 */
export interface CodexAnalystConfig {
  baseUrl: string;
  model: string;
  token: string;
}

export function codexFaceAnalyst(config: CodexAnalystConfig): FaceAnalystPort {
  const provider = createOpenAI({
    baseURL: config.baseUrl,
    apiKey: config.token,
    fetch: (...args) => globalThis.fetch(...args),
  });

  return {
    async analyse(request) {
      let text: string;
      try {
        const answer = await generateText({
          model: provider.responses(config.model),
          headers: {
            // The endpoint refuses a request without a session and says so:
            // "cannot be routed efficiently". A fresh id per call rather than
            // one per device, deliberately — a stable id would let a third
            // party link one person's analyses to each other, and the privacy
            // policy says nothing about this request identifies whose it is.
            // The cost is their prompt cache, which is theirs to lose.
            'x-opencode-session': crypto.randomUUID(),
            'user-agent': 'loxa/1.0',
          },
          // The SDK's own retry is off: this port already has a retry, and it
          // is a different provider rather than the same one again. Leaving
          // both on would make a dead endpoint take three timeouts before
          // Google is asked, with the user watching a spinner throughout.
          maxRetries: 0,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: buildSuitabilityPrompt(request.catalogue, request.limit) },
                ...request.photosBase64.map((data) => ({
                  type: 'image' as const,
                  image: `data:image/jpeg;base64,${data}`,
                })),
              ],
            },
          ],
        });
        text = answer.text;
      } catch (err) {
        // Everything the SDK throws is treated as the provider's problem:
        // a bad key, a stopped container and a rate limit are all "this box is
        // not answering", and the fallback is one Google call away.
        throw new RendererUnavailableError(`codex endpoint: ${describe(err)}`, true);
      }

      const draft = readDraft(extractJson(text));
      if (!draft) {
        throw new RendererUnavailableError('codex endpoint answered with something that is not an analysis', true);
      }

      return draft;
    },
  };
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
