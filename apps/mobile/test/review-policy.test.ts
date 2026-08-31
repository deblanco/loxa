import { describe, expect, it } from 'vitest';
import {
  ASK_CHANCE,
  ASK_COOLDOWN_MS,
  ASK_WINDOW_MS,
  EMPTY_REVIEW_STATE,
  MAX_ASKS,
  MIN_RENDERS,
  parseReviewState,
  recordAsk,
  recordRender,
  serialiseReviewState,
  shouldAsk,
  type ReviewState,
} from '../src/review/policy';

const NOW = new Date('2026-08-30T12:00:00.000Z');

/** An ISO timestamp `ms` before `NOW`. */
function ago(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

/** A roll that always passes, so the other rules are what the assertion is about. */
const PASSES = 0;
const FAILS = 1;

const RENDERED: ReviewState = { renders: MIN_RENDERS, asks: [] };

describe('shouldAsk', () => {
  it('says nothing until a render has succeeded', () => {
    // The whole premise: the prompt follows the payoff. Asking somebody who has
    // not yet seen their own face come back is asking about nothing.
    expect(shouldAsk({ renders: MIN_RENDERS - 1, asks: [] }, NOW, PASSES)).toBe(false);
    expect(shouldAsk(RENDERED, NOW, PASSES)).toBe(true);
  });

  it('is the roll, not the render count, that decides once eligible', () => {
    expect(shouldAsk({ renders: 40, asks: [] }, NOW, FAILS)).toBe(false);
  });

  it('treats the chance as a strict cut', () => {
    expect(shouldAsk(RENDERED, NOW, ASK_CHANCE - Number.EPSILON)).toBe(true);
    expect(shouldAsk(RENDERED, NOW, ASK_CHANCE)).toBe(false);
  });

  it('holds off until the cooldown has run', () => {
    const asked: ReviewState = { renders: 9, asks: [ago(ASK_COOLDOWN_MS - 60_000)] };
    expect(shouldAsk(asked, NOW, PASSES)).toBe(false);

    const older: ReviewState = { renders: 9, asks: [ago(ASK_COOLDOWN_MS)] };
    expect(shouldAsk(older, NOW, PASSES)).toBe(true);
  });

  it('stops at the cap iOS itself enforces', () => {
    // Past three in a year the call is a silent no-op, so spending a prompt on
    // it buys nothing and loses the record of having tried.
    const spent = Array.from({ length: MAX_ASKS }, (_, i) =>
      ago(ASK_COOLDOWN_MS + i * 24 * 60 * 60 * 1000),
    );
    expect(shouldAsk({ renders: 9, asks: spent }, NOW, PASSES)).toBe(false);
  });

  it('lets the cap go once an ask falls out of the year', () => {
    const spent = [ago(ASK_WINDOW_MS + 1000), ago(ASK_COOLDOWN_MS), ago(ASK_COOLDOWN_MS * 2)];
    expect(shouldAsk({ renders: 9, asks: spent }, NOW, PASSES)).toBe(true);
  });

  it('measures the cooldown from the newest ask, whatever order they are stored in', () => {
    const jumbled = [ago(ASK_COOLDOWN_MS * 3), ago(60_000), ago(ASK_COOLDOWN_MS * 2)];
    expect(shouldAsk({ renders: 9, asks: jumbled }, NOW, PASSES)).toBe(false);
  });

  it('ignores an ask that is not a date rather than counting it', () => {
    // A bad write must not be able to silence the prompt for a year: an entry
    // that cannot be compared to a cooldown cannot be trusted to hold one.
    expect(shouldAsk({ renders: 9, asks: ['not a date'] }, NOW, PASSES)).toBe(true);
  });

  it('ignores an ask dated in the future', () => {
    // A clock that moved, not a prompt from next month.
    const ahead = new Date(NOW.getTime() + ASK_COOLDOWN_MS).toISOString();
    expect(shouldAsk({ renders: 9, asks: [ahead] }, NOW, PASSES)).toBe(true);
  });
});

describe('recordAsk', () => {
  it('appends the moment it was raised', () => {
    expect(recordAsk(RENDERED, NOW).asks).toEqual([NOW.toISOString()]);
  });

  it('drops the asks that have aged out of the window', () => {
    // Otherwise the array grows for the life of the install, and the cap
    // quietly becomes a lifetime one rather than a rolling year.
    const state: ReviewState = { renders: 9, asks: [ago(ASK_WINDOW_MS + 1), ago(ASK_COOLDOWN_MS)] };
    expect(recordAsk(state, NOW).asks).toEqual([ago(ASK_COOLDOWN_MS), NOW.toISOString()]);
  });

  it('leaves the render count alone', () => {
    expect(recordAsk({ renders: 7, asks: [] }, NOW).renders).toBe(7);
  });
});

describe('recordRender', () => {
  it('counts up without touching the asks', () => {
    const state: ReviewState = { renders: 2, asks: [ago(1000)] };
    expect(recordRender(state)).toEqual({ renders: 3, asks: [ago(1000)] });
  });
});

describe('parseReviewState', () => {
  it('round-trips what was written', () => {
    const state: ReviewState = { renders: 4, asks: [ago(1000), NOW.toISOString()] };
    expect(parseReviewState(serialiseReviewState(state))).toEqual(state);
  });

  it('falls back to empty for nothing, garbage, and a non-object', () => {
    // Never throws: this is read on the result screen, behind the user's own
    // photograph, and a rating prompt has no business breaking that.
    expect(parseReviewState(null)).toEqual(EMPTY_REVIEW_STATE);
    expect(parseReviewState('')).toEqual(EMPTY_REVIEW_STATE);
    expect(parseReviewState('not json')).toEqual(EMPTY_REVIEW_STATE);
    expect(parseReviewState('"a string"')).toEqual(EMPTY_REVIEW_STATE);
    expect(parseReviewState('null')).toEqual(EMPTY_REVIEW_STATE);
  });

  it('drops a field of the wrong type without losing the other one', () => {
    expect(parseReviewState(JSON.stringify({ renders: 'four', asks: [ago(1000)] }))).toEqual({
      renders: 0,
      asks: [ago(1000)],
    });
    expect(parseReviewState(JSON.stringify({ renders: 4, asks: 'nope' }))).toEqual({
      renders: 4,
      asks: [],
    });
  });

  it('keeps only the entries in the ask list that are strings', () => {
    const raw = JSON.stringify({ renders: 1, asks: [ago(1000), 5, null, { at: 'x' }] });
    expect(parseReviewState(raw).asks).toEqual([ago(1000)]);
  });

  it('clamps a render count that is not a whole number of renders', () => {
    expect(parseReviewState(JSON.stringify({ renders: -3, asks: [] })).renders).toBe(0);
    expect(parseReviewState(JSON.stringify({ renders: 2.7, asks: [] })).renders).toBe(2);
    expect(parseReviewState(JSON.stringify({ renders: null, asks: [] })).renders).toBe(0);
  });
});
