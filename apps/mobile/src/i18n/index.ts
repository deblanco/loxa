import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de';
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import it from './locales/it';
import { resolveLanguage, type Language } from './languages';

/**
 * The platform half of the language: storage, the device's list, and i18next.
 *
 * Initialised at import with the phone's language rather than with English,
 * because the resources are static imports and the init is therefore
 * synchronous — the first frame is already in the right language, and the
 * stored preference then only has to correct the minority of installs where
 * somebody chose something else.
 *
 * That correction is `loadLanguage`, awaited behind the splash in `_layout`
 * alongside the fonts. Doing it after the first frame would flash the wrong
 * language on the entry carousel, which is the screen with the most words on it.
 */

/** The chosen language, if one was chosen. Absent means "follow the phone". */
export const LANGUAGE_KEY = 'loxa.language.v1';

function deviceTags(): string[] {
  return Localization.getLocales().map((locale) => locale.languageTag);
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    it: { translation: it },
  },
  lng: resolveLanguage(null, deviceTags()),
  fallbackLng: 'en',
  // The app is React Native. There is no HTML to escape, and escaping turns a
  // catalogue name with an apostrophe in it into `&#39;` on the badge.
  interpolation: { escapeValue: false },
});

/** Apply the stored choice, if there is one. Called once, behind the splash. */
export async function loadLanguage(): Promise<void> {
  const stored = await AsyncStorage.getItem(LANGUAGE_KEY).catch(() => null);
  const language = resolveLanguage(stored, deviceTags());
  if (language !== i18n.language) await i18n.changeLanguage(language);
}

/**
 * Switch language, and remember it.
 *
 * Stored before the switch, so a write that fails takes the visible change with
 * it rather than leaving the app speaking a language it will forget on the next
 * launch.
 */
export async function setLanguage(language: Language): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
  await i18n.changeLanguage(language);
}

/** What is on screen now, narrowed to something the picker can tick. */
export function currentLanguage(): Language {
  return resolveLanguage(i18n.language, deviceTags());
}

export default i18n;
