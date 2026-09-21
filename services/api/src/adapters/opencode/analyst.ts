import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import { RendererUnavailableError } from '../../core/errors';
import type { FaceAnalystPort } from '../../ports/face-analyst';
import { extractJson, readDraft } from '../json-answer';
import { buildSuitabilityPrompt } from '../suitability-prompt';

/**
 * The primary analyst: an OpenAI-compatible endpoint we reach through the
 * Vercel AI SDK.
 *
 * The model is a vision model with zero data retention. That is not a
 * preference — the service's catalogue marks some of its models "training
 * use", and this app's privacy policy says we do not use anybody's photos to
 * train anything. A face is not a prompt we are free to donate, so a model
 * that learns from what it is shown cannot be pointed at this route however
 * well it answers.
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
 * Chat completions rather than the Responses API, because that is what the
 * vision model speaks. The SDK still validates the reply, and a server that
 * omits a field OpenAI always sends fails here rather than at the parse below
 * — survivable because of the rule in the next paragraph.
 *
 * Failures here are **transient by default**, which is the opposite of the
 * image renderer's posture and deliberate: an image call carries a bill and a
 * safety verdict that a second provider would only repeat, whereas this is a
 * few hundred text tokens with no verdict attached. A box in somebody's house
 * answering badly is precisely the "ask Google instead" case.
 */
export interface OpencodeAnalystConfig {
  baseUrl: string;
  model: string;
  token: string;
}

export function opencodeFaceAnalyst(config: OpencodeAnalystConfig): FaceAnalystPort {
  const provider = createOpenAICompatible({
    name: 'opencode',
    baseURL: config.baseUrl,
    apiKey: config.token,
    fetch: (...args) => globalThis.fetch(...args),
  });

  return {
    async analyse(request) {
      let text: string;
      try {
        const answer = await generateText({
          model: provider.chatModel(config.model),
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
          // Off. Nothing in the Worker reads the SDK's telemetry, and with it on a
          // failed call leaves a second, unawaited copy of the same rejection
          // inside the SDK's own dispatcher: ours is caught below, that one is
          // nobody's, and under the test runner it fails the run with every
          // test green. In production it would be a logged unhandled rejection
          // per failed analysis.
          telemetry: { isEnabled: false },
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
        throw new RendererUnavailableError(`opencode endpoint: ${describe(err)}`, true);
      }

      const draft = readDraft(extractJson(text));
      if (!draft) {
        throw new RendererUnavailableError('opencode endpoint answered with something that is not an analysis', true);
      }

      return draft;
    },
  };
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
