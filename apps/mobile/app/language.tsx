import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chevron } from '@/components/Chevron';
import { Body, Meta } from '@/components/Text';
import { currentLanguage, setLanguage } from '@/i18n';
import { LANGUAGES, LANGUAGE_NAMES, type Language } from '@/i18n/languages';
import { rescheduleDaily } from '@/notifications';
import { color, radius, space } from '@/theme';

/**
 * Choosing a language.
 *
 * A push off the profile rather than a sheet or an inline cycler, because this
 * is the one screen in the app somebody may arrive at unable to read the rest of
 * it: five endonyms in a column, a tick on the current one, and nothing else to
 * decode. The names are never translated — "Spanish" is no help to the person
 * looking for Español.
 *
 * The change is immediate and the screen stays put. `useTranslation` re-renders
 * the whole tree on the switch, so backing out lands on a profile already in
 * the new language, which is the confirmation — a toast saying so would be a
 * sentence in a language they may have just left.
 */
export default function LanguagePicker() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const active = currentLanguage();

  async function choose(language: Language) {
    if (language === active) return;
    await setLanguage(language);
    // iOS holds the daily notification as finished text, not as a key, so a
    // week of it is already queued in the language they just left.
    await rescheduleDaily();
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space.s4,
          paddingBottom: insets.bottom + space.s10,
        }}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
            style={styles.round}
          >
            <Chevron />
          </Pressable>
          <Meta>{t('language.title')}</Meta>
          <View style={styles.round} />
        </View>

        <View style={styles.rows}>
          {LANGUAGES.map((language, index) => {
            const selected = language === active;

            return (
              <Pressable
                key={language}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={LANGUAGE_NAMES[language]}
                onPress={() => void choose(language)}
                style={[styles.row, index > 0 && styles.divided]}
              >
                <Body weight={selected ? 'medium' : 'regular'}>{LANGUAGE_NAMES[language]}</Body>
                {selected ? (
                  <View style={styles.tick}>
                    <Body variant="caption" tone="paper">
                      ✓
                    </Body>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Meta variant="note" tone="ink45" sentence style={styles.note}>
          {t('language.note')}
        </Meta>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  header: {
    paddingHorizontal: space.gutterTextWide,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  round: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.ink12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rows: {
    margin: space.gutterScreen,
    marginTop: space.s6,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.ink09,
    overflow: 'hidden',
  },
  row: {
    padding: space.gutterText,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  divided: { borderTopWidth: 1, borderTopColor: color.ink07 },
  tick: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { marginHorizontal: space.gutterScreen, textAlign: 'center' },
});
