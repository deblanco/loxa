import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chevron } from '@/components/Chevron';
import { LookTile } from '@/components/LookTile';
import { Pill } from '@/components/Pill';
import { Body, Display, Meta } from '@/components/Text';
import { listLooks, type Look } from '@/store/results';
import { color, radius, space } from '@/theme';

/**
 * Every look made on this phone, newest first.
 *
 * The renders were always written to disk; until this screen a look could only
 * be seen from the result it was made on. Two columns of the pictures
 * themselves, captioned from their own records, so the grid renders offline
 * and keeps a cut the catalogue has since withdrawn.
 *
 * Tapping one reopens it on the result screen with `from=looks`, where it can
 * be compared against the original, shared, or deleted.
 */
export default function Looks() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Null until the directory has been read, so the empty state is never
  // flashed at somebody who has looks.
  const [looks, setLooks] = useState<Look[] | null>(null);

  // On focus rather than once: a look deleted from the result screen has to be
  // gone when this screen comes back.
  useFocusEffect(
    useCallback(() => {
      void listLooks()
        .then(setLooks)
        .catch(() => setLooks([]));
    }, []),
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.s4 }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.round}
        >
          <Chevron />
        </Pressable>
        <Meta>{t('looks.title')}</Meta>
        <View style={styles.headerSpacer} />
      </View>

      {looks && looks.length === 0 ? (
        <View style={styles.empty}>
          <Display variant="displayM">{t('looks.emptyHeadline')}</Display>
          <Display variant="displayM" italic>
            {t('looks.emptyHeadlineItalic')}
          </Display>
          <Body tone="ink55" style={styles.emptyNote}>
            {t('looks.emptyNote')}
          </Body>
          <Pill label={t('looks.start')} onPress={() => router.dismissTo('/preview')} />
        </View>
      ) : (
        <FlatList
          data={looks ?? []}
          keyExtractor={(look) => look.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + space.s10 }]}
          renderItem={({ item }) => <LookTile look={item} style={styles.tile} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  header: {
    paddingHorizontal: space.gutterTextWide,
    paddingBottom: space.s4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // The profile header's arrangement, for the same reason: the spacer balances
  // the back button so the title is centred.
  headerSpacer: { width: 34, height: 34 },
  round: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.ink12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { paddingHorizontal: space.gutterScreen, gap: space.s4 },
  row: { gap: space.s3 },
  tile: { flex: 1 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.gutterHero,
    gap: space.s1,
  },
  emptyNote: { marginTop: space.s3, marginBottom: space.s6 },
});
