import { findColor, findStyle } from '@loxa/shared';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ColorStrip } from '@/components/ColorStrip';
import { CreditChip } from '@/components/CreditChip';
import { PhotoPlate } from '@/components/PhotoPlate';
import { Pill } from '@/components/Pill';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StyleStrip } from '@/components/StyleStrip';
import { Body, Meta } from '@/components/Text';
import { pickFromLibrary } from '@/photo';
import { INITIAL_SELECTION, primaryAction, primaryActionLabel, withSource } from '@/selection';
import { useCredits } from '@/store/credits';
import { color, radius, space } from '@/theme';

/**
 * The main screen, and the only one the user really lives on.
 *
 * A photograph, a style, a colour, and one button. Everything else on it — the
 * credit chip, the source toggle, the strip headers — is there to make the cost
 * and the inputs of that button legible before it is pressed.
 */
export default function Preview() {
  const insets = useSafeAreaInsets();
  const { credits, refresh } = useCredits();
  const [selection, setSelection] = useState(INITIAL_SELECTION);
  const [photo, setPhoto] = useState<{ base64: string; uri: string } | null>(null);

  // The camera hands the shot back through the router rather than through a
  // store: it is one value, used once, on the way back to exactly this screen.
  const params = useLocalSearchParams<{ photoUri?: string; photoBase64?: string }>();
  useEffect(() => {
    if (params.photoUri && params.photoBase64) {
      setPhoto({ uri: params.photoUri, base64: params.photoBase64 });
      setSelection((current) => ({ ...current, source: 'new', hasFreshShot: true, hasPhoto: true }));
    }
  }, [params.photoUri, params.photoBase64]);

  const style = findStyle(selection.styleId);
  const colorName = findColor(selection.colorId)?.name ?? '';

  const choosePhoto = useCallback(async () => {
    const picked = await pickFromLibrary();
    if (!picked) return;
    setPhoto(picked);
    setSelection((current) => ({ ...current, hasPhoto: true }));
  }, []);

  // The balance changes while this screen is not the one on top: a render spends
  // one, a purchase on the paywall adds one. Without this the chip goes stale
  // after a purchase — the user pays, comes back, and sees the same zero.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function onPrimary() {
    switch (primaryAction(selection, credits?.creditsLeft ?? null)) {
      case 'paywall':
        // Straight to the offer. The Worker would refuse this anyway, but not
        // before the user had watched a progress bar for a round trip.
        router.push('/paywall');
        return;
      case 'camera':
        router.push('/camera');
        return;
      case 'pick-photo':
        await choosePhoto();
        return;
      case 'generate':
        if (!photo) return;
        router.push({
          pathname: '/generating',
          params: { base64: photo.base64, styleId: selection.styleId, colorId: selection.colorId },
        });
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.s4 }]}>
      <View style={styles.header}>
        <Meta variant="wordmarkSmall" tone="ink">
          Loxa
        </Meta>
        <View style={styles.headerRight}>
          <CreditChip credits={credits?.creditsLeft ?? 0} onPress={() => router.push('/profile')} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile"
            onPress={() => router.push('/profile')}
            style={styles.avatar}
          />
        </View>
      </View>

      <Pressable style={styles.plateWrap} onPress={choosePhoto}>
        <PhotoPlate
          uri={photo?.uri}
          label={photo ? undefined : 'tap to choose a photo'}
          style={styles.plate}
        >
          <View style={styles.badge}>
            <Body variant="tile" weight="medium">
              {style?.name} · {colorName}
            </Body>
          </View>
        </PhotoPlate>
      </Pressable>

      <View style={styles.controls}>
        <SegmentedControl
          value={selection.source}
          onChange={(source) => setSelection((current) => withSource(current, source))}
          options={[
            { value: 'saved', label: 'Saved photo' },
            { value: 'new', label: selection.hasFreshShot ? 'New photo ✓' : 'New photo' },
          ]}
        />

        <Pill label={primaryActionLabel(selection)} hint="1 credit" onPress={onPrimary} />
      </View>

      <ScrollView
        style={styles.strips}
        contentContainerStyle={[styles.stripsContent, { paddingBottom: insets.bottom + space.s6 }]}
        showsVerticalScrollIndicator={false}
      >
        <StyleStrip
          selectedId={selection.styleId}
          onSelect={(styleId) => setSelection((current) => ({ ...current, styleId }))}
        />
        <ColorStrip
          selectedId={selection.colorId}
          onSelect={(colorId) => setSelection((current) => ({ ...current, colorId }))}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  header: {
    paddingHorizontal: space.gutterTextWide,
    paddingBottom: space.s3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: space.s2 + 2 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: color.placeholder,
    borderWidth: 1,
    borderColor: color.ink12,
  },
  plateWrap: { flex: 1, marginHorizontal: space.gutterScreen },
  plate: { flex: 1 },
  badge: {
    position: 'absolute',
    top: space.s3,
    left: space.s3,
    height: 26,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(250,248,245,0.9)',
    justifyContent: 'center',
  },
  controls: {
    paddingHorizontal: space.gutterScreen,
    paddingTop: space.s3 + 2,
    gap: 11,
  },
  strips: { flexGrow: 0, marginTop: space.gutterText },
  stripsContent: { gap: space.s5 },
});
