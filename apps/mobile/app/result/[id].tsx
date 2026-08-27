import { findColor, findStyle } from '@loxa/shared';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoPlate } from '@/components/PhotoPlate';
import { Pill } from '@/components/Pill';
import { Body, Display, Meta } from '@/components/Text';
import { Toast } from '@/components/Toast';
import { useCredits } from '@/store/credits';
import { readLook, type StoredLook } from '@/store/results';
import { color, radius, space } from '@/theme';

/**
 * The payoff.
 *
 * Night, full-bleed, with the controls floated over it — everything here is
 * arranged so the photograph is the largest thing on the screen and the
 * chrome is the smallest.
 *
 * "Hold to compare" is a press-and-hold rather than a toggle on purpose: a
 * toggle leaves the user unsure which one they are looking at, and holding
 * makes the comparison a gesture with an obvious end.
 */
export default function Result() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { credits } = useCredits();

  const [look, setLook] = useState<StoredLook | null>(null);
  const [comparing, setComparing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void readLook(id).then(setLook);
  }, [id]);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 1600);
  }

  async function save() {
    if (!look) return;
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) return;

    await MediaLibrary.saveToLibraryAsync(look.uri);
    flash('Saved to your camera roll');
  }

  async function share() {
    if (!look || !(await Sharing.isAvailableAsync())) return;
    await Sharing.shareAsync(look.uri, { mimeType: 'image/jpeg' });
  }

  const styleName = look ? (findStyle(look.styleId)?.name ?? '') : '';
  const colorName = look ? (findColor(look.colorId)?.name ?? '') : '';

  return (
    <View style={styles.screen}>
      <PhotoPlate
        dark
        uri={comparing ? undefined : look?.uri}
        label={comparing ? 'original photo' : undefined}
        style={styles.plate}
      />

      <LinearGradient
        colors={['rgba(16,14,13,0.6)', 'rgba(16,14,13,0)', 'rgba(16,14,13,0.85)', 'rgba(16,14,13,0.97)']}
        locations={[0, 0.26, 0.74, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[styles.header, { top: insets.top + space.s3 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.replace('/preview')}
          style={styles.round}
        >
          <Body tone="paper">‹</Body>
        </Pressable>

        <Meta tone="paper60">{credits?.creditsLeft ?? 0} credits left</Meta>

        <Pressable accessibilityRole="button" onPress={save} style={styles.save}>
          <Body variant="bodySmall" tone="paper">
            Save
          </Body>
        </Pressable>
      </View>

      <View style={[styles.caption, { bottom: insets.bottom + 96 }]}>
        <Display variant="displayS" tone="paper">
          {styleName},
        </Display>
        <Display variant="displayS" tone="paper" italic style={styles.colorLine}>
          {colorName}
        </Display>

        <Pressable
          accessibilityRole="button"
          onPressIn={() => setComparing(true)}
          onPressOut={() => setComparing(false)}
          style={styles.compare}
        >
          <Meta variant="note" tone="paper85" sentence>
            {comparing ? 'showing original' : 'hold to compare'}
          </Meta>
        </Pressable>
      </View>

      <View style={[styles.actions, { bottom: insets.bottom + space.s5 }]}>
        <Pill label="Share" tone="light" onPress={share} />
        <Pill
          label="Again · 1 credit"
          tone="quietOnNight"
          onPress={() => router.replace('/preview')}
        />
      </View>

      <Toast message={toast} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.night },
  plate: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 0 },
  header: {
    position: 'absolute',
    left: space.gutterText,
    right: space.gutterText,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  round: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: color.paper16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  save: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.paper16,
    justifyContent: 'center',
  },
  caption: { position: 'absolute', left: space.s6, right: space.s6 },
  colorLine: { opacity: 0.85 },
  compare: {
    alignSelf: 'flex-start',
    marginTop: space.s2 + 2,
    height: 30,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.paper30,
    justifyContent: 'center',
  },
  actions: { position: 'absolute', left: space.s6, right: space.s6, gap: space.s2 + 2 },
});
