/**
 * When to ask for an App Store rating, as pure functions.
 *
 * iOS decides the last word here and tells us almost nothing about it: the
 * sheet is capped at three appearances per year per app, past which
 * `requestReview` is a silent no-op, and **it never reports whether a review
 * was actually left**. So "only ask people who have not rated yet" is not a
 * thing the app can know. The honest version of that intent is *do not waste
 * the three* — which is what the rules below are.
 *
 * Separate from `store/review.ts` so the rules can be tested in Node, with no
 * AsyncStorage and no StoreKit. A mock of StoreKit proves nothing about
 * StoreKit; a table of dates proves everything about a cooldown.
 */

/** The ask follows a success, never precedes one. */
export const MIN_RENDERS = 1;

/** iOS's own cap. Asking past it spends a prompt on a call that does nothing. */
export const MAX_ASKS = 3;

/** The window the cap applies over, matching iOS's. */
export const ASK_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

/** Two sheets in a week reads as nagging even from inside the cap. */
export const ASK_COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000;

/**
 * The odds on each eligible result screen.
 *
 * The randomness is the point: asking on a fixed render number makes the
 * prompt a feature of the app rather than a moment in it, and everybody who
 * renders twice gets it at exactly the same second time. At 0.3 about nine
 * users in ten have been asked by their sixth look.
 */
export const ASK_CHANCE = 0.3;

export interface ReviewState {
  /** Successful renders on this install, ever. */
  renders: number;
  /** ISO timestamps of prompts actually raised, oldest first. */
  asks: string[];
}

export const EMPTY_REVIEW_STATE: ReviewState = { renders: 0, asks: [] };

export function serialiseReviewState(state: ReviewState): string {
  return JSON.stringify(state);
}

/**
 * Read the stored state, tolerating anything that is not it.
 *
 * Falls back to empty rather than throwing, and rather than repairing: a value
 * this cannot read is worth at most a delayed prompt, and this runs on the
 * result screen, behind the user's own photograph. Nothing here is allowed to
 * be the reason that screen fails.
 */
export function parseReviewState(raw: string | null): ReviewState {
  if (!raw) return EMPTY_REVIEW_STATE;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_REVIEW_STATE;
  }

  if (typeof parsed !== 'object' || parsed === null) return EMPTY_REVIEW_STATE;
  const { renders, asks } = parsed as { renders?: unknown; asks?: unknown };

  return {
    // A negative or fractional count is not a count. Clamped rather than
    // rejected, because the asks beside it are still worth honouring.
    renders: typeof renders === 'number' && Number.isFinite(renders) ? Math.max(0, Math.floor(renders)) : 0,
    asks: Array.isArray(asks) ? asks.filter((at): at is string => typeof at === 'string') : [],
  };
}

export function recordRender(state: ReviewState): ReviewState {
  return { ...state, renders: state.renders + 1 };
}

/**
 * Note that a prompt was raised, and forget the ones that no longer count.
 *
 * The pruning is what makes the cap a rolling year rather than a lifetime: iOS
 * forgives three a year, and so does this. It also keeps the array bounded,
 * which matters for a value read on every result screen.
 */
export function recordAsk(state: ReviewState, now: Date): ReviewState {
  return {
    ...state,
    asks: [...asksWithin(state.asks, now), now.toISOString()],
  };
}

/**
 * Whether to raise the sheet now.
 *
 * `roll` is passed in rather than drawn here, so the caller owns the only
 * unpredictable thing in the decision and every rule below can be asserted
 * against a fixed number.
 */
export function shouldAsk(state: ReviewState, now: Date, roll: number): boolean {
  if (state.renders < MIN_RENDERS) return false;

  const recent = asksWithin(state.asks, now);
  if (recent.length >= MAX_ASKS) return false;

  const last = recent[recent.length - 1];
  if (last !== undefined && now.getTime() - Date.parse(last) < ASK_COOLDOWN_MS) return false;

  return roll < ASK_CHANCE;
}

/**
 * The asks still inside the window, oldest first.
 *
 * Unparseable timestamps are dropped rather than counted: a stored string that
 * is not a date cannot be compared against a cooldown, and counting it towards
 * the cap would silence the prompt forever on the strength of a bad write. A
 * timestamp from the future is dropped for the same reason — a clock that moved
 * must not be able to hold the sheet back for a year.
 */
function asksWithin(asks: readonly string[], now: Date): string[] {
  const at = now.getTime();
  return asks
    .map((iso) => ({ iso, ms: Date.parse(iso) }))
    .filter(({ ms }) => Number.isFinite(ms) && ms <= at && at - ms < ASK_WINDOW_MS)
    .sort((a, b) => a.ms - b.ms)
    .map(({ iso }) => iso);
}
