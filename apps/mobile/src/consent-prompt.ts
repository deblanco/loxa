import { router } from 'expo-router';
import type { ConsentKind } from '@/consent';
import { hasConsent } from '@/store/consent';

/**
 * Ask, and wait for the answer.
 *
 * The call sites are two `async` functions that want a yes or a no before they
 * go on: `await ensureConsent('render')` reads like the rule it is. The sheet is
 * a route, so the answer crosses a screen boundary — held here, resolved by
 * `answerConsent` from the sheet.
 *
 * One question at a time. A second `ensureConsent` while one is open resolves
 * the first as "no" rather than stacking two sheets.
 */
let pending: { kind: ConsentKind; resolve: (agreed: boolean) => void } | null = null;

export async function ensureConsent(kind: ConsentKind): Promise<boolean> {
  if (await hasConsent(kind)) return true;

  return await new Promise<boolean>((resolve) => {
    pending?.resolve(false);
    pending = { kind, resolve };
    router.push({ pathname: '/consent', params: { kind } });
  });
}

/**
 * Called by the sheet, exactly once per showing, with what the person did.
 *
 * Dismissing any way at all — the button, the scrim, the swipe — is a "no", and
 * a "no" is not an error: nothing was sent, and pressing Try On again asks again.
 */
export function answerConsent(kind: ConsentKind, agreed: boolean): void {
  if (pending?.kind !== kind) return;
  const { resolve } = pending;
  pending = null;
  resolve(agreed);
}
