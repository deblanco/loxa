/**
 * Which language the app speaks, as a pure decision.
 *
 * Split from `index.ts` so the rule is testable in Node: `index.ts` imports
 * expo-localization and i18next and cannot be loaded outside a device, and the
 * part worth testing — what a Swiss phone set to `de-CH` with nothing stored
 * resolves to — imports nothing at all.
 */

/** Every language the app has copy for. `en` is the source and the fallback. */
export const LANGUAGES = ['en', 'es', 'fr', 'de', 'it'] as const;

export type Language = (typeof LANGUAGES)[number];

/**
 * Each language in its own words.
 *
 * Endonyms, because the picker is read by somebody who cannot currently read
 * the app — "Spanish" is no help to the person looking for Español.
 */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * The language to speak: what they chose, else what the phone is set to, else
 * English.
 *
 * `preferred` is the stored choice and wins outright — somebody who picked
 * English on a German phone meant it, and a later OS update must not overrule
 * them. Everything after it is the phone's own list, in the order iOS ranks it,
 * so a device set to Catalan then Spanish lands on Spanish rather than on the
 * fallback.
 *
 * Tags are matched on the primary subtag alone: `de-CH`, `de-AT` and `de` are
 * one language here. Regional copy is a thing this app does not have, and
 * refusing to match it would send a Swiss phone to English.
 */
export function resolveLanguage(
  preferred: string | null | undefined,
  deviceTags: readonly string[],
): Language {
  if (isLanguage(preferred)) return preferred;

  for (const tag of deviceTags) {
    const primary = tag.split(/[-_]/)[0]?.toLowerCase();
    if (isLanguage(primary)) return primary;
  }

  return 'en';
}
