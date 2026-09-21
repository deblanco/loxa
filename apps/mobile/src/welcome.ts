/**
 * The three things somebody is told before they use the app.
 *
 * Keys rather than sentences, like `format.ts` and `face/verdict.ts`: the
 * screen calls `t` on what this hands back, which is what lets the order and
 * the rules be tested in Node with no i18next loaded.
 *
 * The order is the argument. What you get comes first because nothing else
 * matters if they do not want it; the photo comes second because it is the one
 * thing that makes the first render one tap; the face explanation comes last
 * because it answers the question the photo step raises — what happens to it.
 */
export const WELCOME_STEPS = ['value', 'photo', 'face'] as const;

export type WelcomeStep = (typeof WELCOME_STEPS)[number];

export interface WelcomeCopy {
  headline: `welcome.${WelcomeStep}Headline`;
  headlineItalic: `welcome.${WelcomeStep}HeadlineItalic`;
  body: `welcome.${WelcomeStep}Body`;
}

export function welcomeCopy(step: WelcomeStep): WelcomeCopy {
  return {
    headline: `welcome.${step}Headline`,
    headlineItalic: `welcome.${step}HeadlineItalic`,
    body: `welcome.${step}Body`,
  };
}

/** The step after this one, or null when this was the last. */
export function nextStep(step: WelcomeStep): WelcomeStep | null {
  return WELCOME_STEPS[WELCOME_STEPS.indexOf(step) + 1] ?? null;
}

/** The step before this one, or null when this was the first. */
export function previousStep(step: WelcomeStep): WelcomeStep | null {
  const index = WELCOME_STEPS.indexOf(step);
  return index > 0 ? (WELCOME_STEPS[index - 1] ?? null) : null;
}

/**
 * Whether leaving this step forward ends onboarding.
 *
 * The flag is written once, here, rather than at each step: a user who is
 * teleported into the app half way through has not been onboarded, they have
 * been interrupted.
 */
export function isLastStep(step: WelcomeStep): boolean {
  return nextStep(step) === null;
}
