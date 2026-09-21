import { describe, expect, it } from 'vitest';
import en from '../src/i18n/locales/en';
import {
  WELCOME_STEPS,
  isLastStep,
  nextStep,
  previousStep,
  welcomeCopy,
  type WelcomeStep,
} from '../src/welcome';

describe('the welcome steps', () => {
  it('says what it is for, asks for a photo, explains the face, then asks to notify', () => {
    // The order is the argument, so it is the thing worth pinning: nothing else
    // matters if they do not want the app, the face explanation answers the
    // question the photo step raises, and the notification ask is last because
    // it is the one step that puts a system prompt on screen.
    expect(WELCOME_STEPS).toEqual(['value', 'photo', 'face', 'notify']);
  });

  it('walks forward to the end and stops', () => {
    expect(nextStep('value')).toBe('photo');
    expect(nextStep('photo')).toBe('face');
    expect(nextStep('face')).toBe('notify');
    expect(nextStep('notify')).toBeNull();
  });

  it('walks back to the start and stops', () => {
    expect(previousStep('notify')).toBe('face');
    expect(previousStep('face')).toBe('photo');
    expect(previousStep('value')).toBeNull();
  });

  it('ends onboarding on the last step and on no other', () => {
    const ending = WELCOME_STEPS.filter(isLastStep);
    expect(ending).toEqual(['notify']);
  });

  it('names copy that actually exists, for every step', () => {
    // The keys are built by template, so a renamed step would produce a key
    // that types fine and renders as itself on somebody's screen.
    const welcome = en.welcome as Record<string, string>;
    for (const step of WELCOME_STEPS satisfies readonly WelcomeStep[]) {
      const copy = welcomeCopy(step);
      for (const key of Object.values(copy)) {
        expect(welcome[key.replace('welcome.', '')]).toBeTruthy();
      }
    }
  });
});
