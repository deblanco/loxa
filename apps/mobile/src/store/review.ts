import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Linking } from 'react-native';
import {
  EMPTY_REVIEW_STATE,
  parseReviewState,
  recordAsk,
  recordRender,
  serialiseReviewState,
  shouldAsk,
  type ReviewState,
} from '@/review/policy';

/**
 * The rating prompt, and the only place that talks to StoreKit about it.
 *
 * The rules live in `review/policy.ts`; this half holds the state and makes the
 * call. Everything here fails quietly on purpose: this runs behind the result
 * screen, over the user's own photograph, and a rating prompt has no business
 * being the reason that screen breaks.
 */
const KEY = 'loxa.review.v1';

async function read(): Promise<ReviewState> {
  try {
    return parseReviewState(await AsyncStorage.getItem(KEY));
  } catch {
    return EMPTY_REVIEW_STATE;
  }
}

async function write(state: ReviewState): Promise<void> {
  await AsyncStorage.setItem(KEY, serialiseReviewState(state)).catch(() => {});
}

/**
 * A render finished and was saved.
 *
 * Called from `generating.tsx` rather than from the result screen, because this
 * counts renders and the result screen counts visits — a look reopened later is
 * not a new one.
 */
export async function noteRender(): Promise<void> {
  await write(recordRender(await read()));
}

/**
 * Raise the sheet, if the rules and the roll agree.
 *
 * **The ask is written down only once the call has actually been made.** iOS
 * forgives three prompts a year and there is no way to ask how many are left,
 * so a build without the native module must not quietly spend one of them.
 *
 * `isAvailableAsync` rather than `hasAction`, which is the looser of the two:
 * `hasAction` is also true when there is merely a store URL to fall back on,
 * and `requestReview` then leaves the app for the App Store. That is a fine
 * answer to the profile's own row, where the user asked; it is the wrong one
 * for a prompt that arrived on its own.
 */
export async function maybeAskForReview(): Promise<boolean> {
  try {
    const state = await read();
    if (!shouldAsk(state, new Date(), Math.random())) return false;
    if (!(await StoreReview.isAvailableAsync())) return false;

    await StoreReview.requestReview();
    await write(recordAsk(state, new Date()));
    return true;
  } catch {
    return false;
  }
}

/**
 * The App Store's review page, or null before the app has an id.
 *
 * Reads `expo.ios.appStoreUrl` from the app config. Until that is filled in
 * there is nowhere to send anybody, and the profile row that uses this is not
 * rendered at all — a settings row that opens a 404 is worse than no row.
 */
export function reviewStoreUrl(): string | null {
  try {
    return StoreReview.storeUrl();
  } catch {
    return null;
  }
}

/**
 * Open the store page, for the profile's own row.
 *
 * Deliberately a link rather than `requestReview()`. Apple's guideline is that
 * the sheet is never the answer to a button press — and a prompt that no-ops
 * because the year's three are spent would leave the row doing nothing at all,
 * with no way to tell.
 */
export function openReviewPage(): void {
  const url = reviewStoreUrl();
  if (url) void Linking.openURL(url);
}

/** Development only: put the prompt back within reach. */
export async function clearReviewState(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
