import { describe, expect, it } from 'vitest';
import { CONSENT_KINDS, asConsentKind, consentCopy } from '../src/consent';
import de from '../src/i18n/locales/de';
import en from '../src/i18n/locales/en';
import es from '../src/i18n/locales/es';
import fr from '../src/i18n/locales/fr';
import it_ from '../src/i18n/locales/it';

describe('the consent questions', () => {
  it('asks two, because the render and the analysis go to different companies', () => {
    // A yes to one is not a yes to the other; collapsing them into one question
    // would be the exact thing 5.1.2(i) exists to stop.
    expect(CONSENT_KINDS).toEqual(['render', 'analysis']);
  });

  it('names copy that exists in every language, for both questions', () => {
    // The keys are built by template, so a renamed line would type-check and
    // then render as its own key on the one screen being read as a contract.
    for (const locale of [en, es, fr, de, it_]) {
      const consent = locale.consent as Record<string, string>;
      for (const kind of CONSENT_KINDS) {
        for (const key of Object.values(consentCopy(kind))) {
          expect(consent[key.replace('consent.', '')], `${key}`).toBeTruthy();
        }
      }
    }
  });

  it('says where it goes, what is kept, and what is never sent, and nothing else', () => {
    expect(Object.keys(consentCopy('render')).sort()).toEqual(
      ['goesTo', 'headline', 'headlineItalic', 'kept', 'never'],
    );
  });

  it('says "our partners" on the sheet and never names the providers', () => {
    // The privacy page names every provider and the sheet links to it. On the
    // sheet itself they are "our partners": a company a person has never heard of
    // is noise in the one paragraph being read as a contract, and it changes when
    // the provider does. Google stays, because the image model is Google's.
    for (const locale of [en, es, fr, de, it_]) {
      for (const key of ['renderGoesTo', 'analysisGoesTo'] as const) {
        expect(locale.consent[key]).not.toMatch(/openrouter|opencode/i);
      }
    }
  });

  it('gives the two questions different words', () => {
    // They name different recipients, so identical text would be wrong for one.
    expect(en.consent.renderGoesTo).not.toBe(en.consent.analysisGoesTo);
  });

  it('never claims what the providers do with a photo beyond what we do', () => {
    // "We do not keep it" is a claim about this app. A sentence of the form
    // "OpenRouter deletes it" would be a claim about somebody else's retention
    // that nothing here can check. Every line is about what *we* do, and a
    // provider's own terms are pointed to, never asserted.
    for (const kind of CONSENT_KINDS) {
      const kept = en.consent[`${kind}Kept`];
      expect(kept).not.toMatch(/openrouter|google|opencode/i);
      expect(kept).toMatch(/^we /i);
    }
  });
});

describe('asConsentKind', () => {
  it('accepts a real kind and nothing else', () => {
    expect(asConsentKind('render')).toBe('render');
    expect(asConsentKind('analysis')).toBe('analysis');
    expect(asConsentKind('other')).toBeNull();
    expect(asConsentKind(undefined)).toBeNull();
    expect(asConsentKind(['render'])).toBeNull();
  });
});
