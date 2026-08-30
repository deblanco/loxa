import { describe, expect, it } from 'vitest';
import { LANGUAGES, LANGUAGE_NAMES, isLanguage, resolveLanguage } from '../src/i18n/languages';
import de from '../src/i18n/locales/de';
import en from '../src/i18n/locales/en';
import es from '../src/i18n/locales/es';
import fr from '../src/i18n/locales/fr';
// `it` is vitest's, so the Italian locale comes in under its own name.
import italian from '../src/i18n/locales/it';

/**
 * The five languages, and the properties the copy has to keep in all of them.
 *
 * Shape is already `tsc`'s job — every locale but `en` is annotated
 * `: typeof en`, so a missing or stray key is a typecheck failure. What is left
 * for a test is what a type cannot see: an empty string, a note that came back
 * capitalised, a notification that starts nagging.
 */
const LOCALES = { en, es, fr, de, it: italian } as const;

/** Every leaf string in a locale, as `path` → `value`. */
function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value };
  if (typeof value !== 'object' || value === null) return {};

  return Object.entries(value).reduce<Record<string, string>>(
    (all, [key, child]) => ({ ...all, ...flatten(child, prefix ? `${prefix}.${key}` : key) }),
    {},
  );
}

describe('the locales', () => {
  it('has one for every declared language', () => {
    expect(Object.keys(LOCALES).sort()).toEqual([...LANGUAGES].sort());
  });

  for (const [language, locale] of Object.entries(LOCALES)) {
    describe(language, () => {
      const strings = flatten(locale);

      it('says something for every key', () => {
        const blank = Object.entries(strings)
          .filter(([, value]) => value.trim() === '')
          .map(([key]) => key);
        expect(blank).toEqual([]);
      });

      it('keeps every interpolation the English has', () => {
        // A dropped `{{count}}` is invisible until somebody reads "photos a
        // week" with no number in front of it.
        for (const [key, value] of Object.entries(flatten(en))) {
          const wanted = [...value.matchAll(/{{(\w+)}}/g)].map((match) => match[1]).sort();
          const got = [...(strings[key] ?? '').matchAll(/{{(\w+)}}/g)]
            .map((match) => match[1])
            .sort();
          expect(got, key).toEqual(wanted);
        }
      });

      it('keeps the verdict lines in the shape of the hint they replace', () => {
        // One lowercase clause, then what to do about it. They are read in the
        // same place as the viewfinder hint, in the same moment, so a
        // capitalised sentence there is a different component.
        for (const line of Object.values(locale.verdict)) {
          expect(line).toBe(line.toLowerCase());
          expect(line).toContain(' · ');
        }
      });

      it('keeps the lowercase mono notes lowercase', () => {
        // `Meta` uppercases by default; `sentence` does not. These are the
        // `sentence` ones, and a capital in them is a translation that quietly
        // changed the type style.
        const notes = [
          locale.preview.tapToChoose,
          locale.preview.catalogueUnavailable,
          locale.preview.needsConnection,
          locale.camera.hint,
          locale.camera.library,
          locale.profile.tapToChangePhoto,
          locale.profile.noRollOver,
          locale.language.note,
        ];
        for (const note of notes) expect(note).toBe(note.toLowerCase());
      });

      it('names a look in every notification rather than naming the app', () => {
        for (const line of Object.values(locale.notifications)) {
          expect(line.title).not.toMatch(/loxa/i);
          expect(line.body.length).toBeGreaterThan(10);
        }
      });

      it('says something different on each notification day', () => {
        const titles = Object.values(locale.notifications).map((line) => line.title);
        expect(new Set(titles).size).toBe(titles.length);
      });
    });
  }
});

describe('LANGUAGE_NAMES', () => {
  it('names each language in its own words, never in English', () => {
    // The picker is read by somebody who cannot currently read the app.
    expect(LANGUAGE_NAMES.es).toBe('Español');
    expect(LANGUAGE_NAMES.de).toBe('Deutsch');
    for (const language of LANGUAGES) expect(LANGUAGE_NAMES[language]).toBeTruthy();
  });
});

describe('resolveLanguage', () => {
  it('follows the phone when nothing has been chosen', () => {
    expect(resolveLanguage(null, ['fr-FR'])).toBe('fr');
  });

  it('matches on the primary subtag, so a regional phone is not sent to English', () => {
    expect(resolveLanguage(null, ['de-CH'])).toBe('de');
    expect(resolveLanguage(null, ['es_419'])).toBe('es');
    expect(resolveLanguage(null, ['IT-it'])).toBe('it');
  });

  it('walks the phone list in order, past languages the app has no copy for', () => {
    expect(resolveLanguage(null, ['ca-ES', 'es-ES', 'en-GB'])).toBe('es');
  });

  it('falls back to English when the phone speaks nothing the app does', () => {
    expect(resolveLanguage(null, ['ja-JP', 'ko-KR'])).toBe('en');
    expect(resolveLanguage(null, [])).toBe('en');
  });

  it('lets an explicit choice overrule the phone', () => {
    // Somebody who picked English on a German phone meant it, and an OS update
    // must not quietly overrule them.
    expect(resolveLanguage('en', ['de-DE'])).toBe('en');
  });

  it('ignores a stored value that is not a language we ship', () => {
    expect(resolveLanguage('pt', ['fr-FR'])).toBe('fr');
    expect(resolveLanguage('', ['fr-FR'])).toBe('fr');
    expect(resolveLanguage(undefined, ['fr-FR'])).toBe('fr');
  });
});

describe('isLanguage', () => {
  it('accepts what we ship and nothing else', () => {
    expect(isLanguage('it')).toBe(true);
    expect(isLanguage('pt')).toBe(false);
    expect(isLanguage(null)).toBe(false);
    expect(isLanguage(7)).toBe(false);
  });
});
