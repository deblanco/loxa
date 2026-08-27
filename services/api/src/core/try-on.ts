import { findColor, findStyle } from '@loxa/shared';
import type { CreditLedgerPort } from '../ports/credit-ledger';
import type { EntitlementsPort } from '../ports/entitlements';
import type { HairRendererPort } from '../ports/hair-renderer';
import type { RenderCachePort } from '../ports/render-cache';
import { renderCacheKey } from './cache-key';
import { OutOfCreditsError } from './errors';
import { available, rollForward, spendOne } from './rules';

export interface TryOnDeps {
  ledger: CreditLedgerPort;
  entitlements: EntitlementsPort;
  renderer: HairRendererPort;
  cache: RenderCachePort;
  now: () => Date;
}

export interface TryOnCommand {
  deviceId: string;
  imageBase64: string;
  styleId: string;
  colorId: string;
}

export interface TryOnResult {
  imageBase64: string;
  creditsLeft: number;
  cached: boolean;
}

/**
 * Generate one look.
 *
 * The order of the four steps below is the whole product's economics, so it is
 * worth being explicit about why it is this order:
 *
 * 1. **Cache first, before the credit check.** A hit costs nothing to serve, so
 *    it should not be gated by a balance — someone who has run out can still
 *    re-open a picture they already paid for.
 * 2. **Spend the credit before the model call.** A cap that is checked after
 *    the expensive thing has happened is not a cap. This is the rule the whole
 *    file exists to enforce.
 * 3. **Render.**
 * 4. **Refund on any throw.** The user got nothing; charging for that is theft
 *    with extra steps. The refund writes the row back as it was, which puts the
 *    credit in the pool it actually came from.
 */
export async function tryOn(command: TryOnCommand, deps: TryOnDeps): Promise<TryOnResult> {
  const style = findStyle(command.styleId);
  const color = findColor(command.colorId);

  // The route already parsed these against the catalogue's enum, so reaching
  // here with an unknown id means the two have drifted apart in the same build.
  if (!style || !color) throw new Error(`unknown style or colour: ${command.styleId}/${command.colorId}`);

  const now = deps.now();
  const key = await renderCacheKey(command.imageBase64, command.styleId, command.colorId);

  const [cached, plan, state] = await Promise.all([
    deps.cache.get(key),
    deps.entitlements.planFor(command.deviceId),
    deps.ledger.read(command.deviceId),
  ]);

  if (cached) {
    return { imageBase64: cached, creditsLeft: available(state, plan, now), cached: true };
  }

  const spent = spendOne(state, plan, now);
  if (!spent) throw new OutOfCreditsError();
  await deps.ledger.write(command.deviceId, spent);

  let rendered: { imageBase64: string };
  try {
    rendered = await deps.renderer.render({
      imageBase64: command.imageBase64,
      stylePrompt: style.prompt,
      colorPrompt: color.prompt,
    });
  } catch (err) {
    // The pre-spend row, rolled to this week — not a reconstruction from the
    // post-spend one. Which pool the credit came from is decided by the state
    // *before* the take, and is not recoverable from the state after it.
    await deps.ledger.write(command.deviceId, rollForward(state, now));
    throw err;
  }

  // Written after the credit, and not awaited for correctness of the answer:
  // a cache miss costs a re-render, a lost image costs the user their picture.
  await deps.cache.put(key, rendered.imageBase64);

  return {
    imageBase64: rendered.imageBase64,
    creditsLeft: available(spent, plan, now),
    cached: false,
  };
}
