import { findColor, findStyle, type PlanId } from '@loxa/shared';
import type { CreditLedgerPort } from '../ports/credit-ledger';
import type { EntitlementsPort } from '../ports/entitlements';
import type { HairRendererPort } from '../ports/hair-renderer';
import type { RenderCachePort } from '../ports/render-cache';
import type { UsageStatsPort } from '../ports/usage-stats';
import { renderCacheKey } from './cache-key';
import { CreditContentionError, OutOfCreditsError, UnknownStyleError } from './errors';
import { available, refundOne, spendOne, type CreditState, type Spend } from './rules';

export interface TryOnDeps {
  ledger: CreditLedgerPort;
  entitlements: EntitlementsPort;
  renderer: HairRendererPort;
  cache: RenderCachePort;
  stats: UsageStatsPort;
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
 *    file exists to enforce. The spend is a compare-and-swap, so two requests
 *    that both read "one credit left" cannot both take it: see `spend`.
 * 3. **Render.**
 * 4. **Refund on any throw.** The user got nothing; charging for that is theft
 *    with extra steps. The refund puts the credit back in the pool it actually
 *    came from, without touching anything else on the row.
 *
 * The style counter is written after each of the two ways this returns, and is
 * the one call here whose failure is swallowed — see `count`.
 */
export async function tryOn(command: TryOnCommand, deps: TryOnDeps): Promise<TryOnResult> {
  const style = findStyle(command.styleId);
  const color = findColor(command.colorId);

  // First, and before the cache read as well as the spend. The wire schema no
  // longer enumerates the catalogue's ids — it cannot, now that the catalogue
  // the app draws is served — so this is the validation, not a re-check of it.
  if (!style || !color) throw new UnknownStyleError(command.styleId, command.colorId);

  const now = deps.now();
  const key = await renderCacheKey(command.imageBase64, command.styleId, command.colorId);

  const [cached, plan, state] = await Promise.all([
    deps.cache.get(key),
    deps.entitlements.planFor(command.deviceId),
    deps.ledger.read(command.deviceId),
  ]);

  if (cached) {
    // A re-open is still somebody choosing this cut, so it counts — as a
    // replay, which is use without spend.
    await count(deps, command, true);
    return { imageBase64: cached, creditsLeft: available(state, plan, now), cached: true };
  }

  const spent = await spend(deps.ledger, command.deviceId, state, plan, now);

  let rendered: { imageBase64: string };
  try {
    rendered = await deps.renderer.render({
      imageBase64: command.imageBase64,
      stylePrompt: style.prompt,
      colorPrompt: color.prompt,
    });
  } catch (err) {
    // Read again, and give back one credit to the pool that paid — never the
    // pre-spend row. A render takes seconds, and a $0.99 purchase syncing in
    // that window is written to this same row: restoring the snapshot would
    // erase a credit the user had already paid for and that `credit_grant`
    // will never hand out a second time.
    await refund(deps.ledger, command.deviceId, spent.pool, now);
    throw err;
  }

  // Written after the credit, and not awaited for correctness of the answer:
  // a cache miss costs a re-render, a lost image costs the user their picture.
  await deps.cache.put(key, rendered.imageBase64);

  // After the render succeeded, never at the spend: a refunded failure that
  // counted would inflate whichever style the model happened to be down for.
  await count(deps, command, false);

  return {
    imageBase64: rendered.imageBase64,
    creditsLeft: available(spent.state, plan, now),
    cached: false,
  };
}

/**
 * How many times a spend or a refund may lose the race for the row.
 *
 * A phone taps once, so one retry is already unusual; three straight losses is
 * a caller running requests for one device in parallel on purpose.
 */
const LEDGER_ATTEMPTS = 3;

/**
 * Take one credit, atomically.
 *
 * `state` is the row as it was read, and the swap only lands if the row still
 * holds it. Without that, N parallel requests each read "one credit left", each
 * compute a spend from it and each write, and one credit buys N renders. On a
 * lost race the row is read again and the decision is made again from what is
 * there now, which is how the second request finds the first one's spend and
 * gets its 402.
 */
async function spend(
  ledger: CreditLedgerPort,
  deviceId: string,
  read: CreditState,
  plan: PlanId,
  now: Date,
): Promise<Spend> {
  let state = read;
  for (let attempt = 1; ; attempt++) {
    const spent = spendOne(state, plan, now);
    if (!spent) throw new OutOfCreditsError();
    if (await ledger.compareAndWrite(deviceId, state, spent.state)) return spent;

    if (attempt === LEDGER_ATTEMPTS) throw new CreditContentionError();
    state = await ledger.read(deviceId);
  }
}

/**
 * Give one credit back to `pool`, atomically, once.
 *
 * Each attempt re-reads and swaps only against what it read, so a spend or a
 * purchase that lands meanwhile is kept rather than overwritten, and a lost
 * race writes nothing — a retry cannot refund twice. If every attempt loses,
 * the credit stays spent and the failure is logged; the caller still gets the
 * render error, which is the more useful thing to tell them.
 */
async function refund(
  ledger: CreditLedgerPort,
  deviceId: string,
  pool: Spend['pool'],
  now: Date,
): Promise<void> {
  for (let attempt = 1; attempt <= LEDGER_ATTEMPTS; attempt++) {
    const current = await ledger.read(deviceId);
    if (await ledger.compareAndWrite(deviceId, current, refundOne(current, pool, now))) return;
  }
  console.error('credit not refunded: the row kept changing');
}

/**
 * Count one use, and never fail because of it.
 *
 * By the time this is called the picture exists and the credit is gone. Letting
 * a counter throw here would hand the user nothing while charging them for it,
 * and the refund is out of reach — it lives in the catch above, which has
 * already been passed. A statistic is worth less than the render it counts.
 */
async function count(deps: TryOnDeps, command: TryOnCommand, cached: boolean): Promise<void> {
  try {
    await deps.stats.record(command.styleId, command.colorId, cached);
  } catch (err) {
    console.error('style use not counted', err);
  }
}
