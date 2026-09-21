/**
 * The two questions asked before a photograph leaves the phone.
 *
 * A photo of somebody's face is sent to an AI model run by somebody else, and
 * App Review 5.1.2(i) wants that said plainly, in the app, and agreed to, before
 * the first time it happens. Two questions rather than one because the
 * recipients differ: a render goes to the image model, "what suits me" goes to a
 * different company's vision model, and a yes to one is not a yes to the other.
 *
 * Keys rather than sentences, like `welcome.ts` and `face/verdict.ts`: the
 * screen calls `t` on what this hands back, which is what lets it be tested in
 * Node with no i18next loaded.
 */
export const CONSENT_KINDS = ['render', 'analysis'] as const;

export type ConsentKind = (typeof CONSENT_KINDS)[number];

export interface ConsentCopy {
  headline: `consent.${ConsentKind}Headline`;
  headlineItalic: `consent.${ConsentKind}HeadlineItalic`;
  goesTo: `consent.${ConsentKind}GoesTo`;
  kept: `consent.${ConsentKind}Kept`;
  never: `consent.${ConsentKind}Never`;
}

export function consentCopy(kind: ConsentKind): ConsentCopy {
  return {
    headline: `consent.${kind}Headline`,
    headlineItalic: `consent.${kind}HeadlineItalic`,
    goesTo: `consent.${kind}GoesTo`,
    kept: `consent.${kind}Kept`,
    never: `consent.${kind}Never`,
  };
}

/** Narrow a route param, which arrives as `string | string[] | undefined`. */
export function asConsentKind(value: unknown): ConsentKind | null {
  return CONSENT_KINDS.find((kind) => kind === value) ?? null;
}
