import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chevron } from '@/components/Chevron';
import { PhotoPlate } from '@/components/PhotoPlate';
import { Pill } from '@/components/Pill';
import { Body, Display, Meta } from '@/components/Text';
import { Toast } from '@/components/Toast';
import { useCredits } from '@/store/credits';
import { humaniseId } from '@/store/look-record';
import { readLook, type Look } from '@/store/results';
import { maybeAskForReview } from '@/store/review';
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { credits } = useCredits();

  const [look, setLook] = useState<Look | null>(null);
  const [comparing, setComparing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void readLook(id).then(setLook);
  }, [id]);

  // The rating prompt, once the picture is on screen and settled.
  //
  // Delayed rather than immediate because the sheet would otherwise land on top
  // of the thing it is asking about, and cleared on unmount so backing out
  // inside the pause cancels it — an ask that arrives over the preview screen
  // is an ask about nothing. Whether it appears at all is `store/review.ts`'s
  // decision; this only offers it the moment.
  useEffect(() => {
    if (!look) return;
    const timer = setTimeout(() => void maybeAskForReview(), 1500);
    return () => clearTimeout(timer);
  }, [look]);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 1600);
  }

  async function save() {
    if (!look) return;
    // Write-only: this adds one picture to the camera roll and never reads it,
    // so the prompt is "Add to Photos" rather than access to every photo the
    // user owns. Asking for the larger of the two is the kind of thing that
    // gets declined, and declining it used to lose the save button silently.
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) {
      flash(t('result.saveDenied'));
      return;
    }

    await MediaLibrary.saveToLibraryAsync(look.uri);
    flash(t('result.saved'));
  }

  async function share() {
    if (!look || !(await Sharing.isAvailableAsync())) return;
    await Sharing.shareAsync(look.uri, { mimeType: 'image/jpeg' });
  }

  // Read off the record, never off the catalogue. This screen shows a picture
  // that already exists, and it must render with no network and no manifest —
  // including for a cut the catalogue has since stopped publishing.
  const styleName = look ? (look.styleName ?? humaniseId(look.styleId)) : '';
  const colorName = look ? (look.colorName ?? humaniseId(look.colorId)) : '';

  return (
    <View style={styles.screen}>
      <PhotoPlate
        dark
        uri={comparing ? undefined : look?.uri}
        label={comparing ? t('result.originalPhoto') : undefined}
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
          accessibilityLabel={t('common.back')}
          onPress={() => router.replace('/preview')}
          style={styles.round}
        >
          <Chevron tone="paper" />
        </Pressable>

        <Meta tone="paper60">{t('result.creditsLeft', { count: credits?.creditsLeft ?? 0 })}</Meta>

        <Pressable accessibilityRole="button" onPress={save} style={styles.save}>
          <Body variant="bodySmall" tone="paper">
            {t('result.save')}
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
            {t(comparing ? 'result.showingOriginal' : 'result.holdToCompare')}
          </Meta>
        </Pressable>
      </View>

      <View style={[styles.actions, { bottom: insets.bottom + space.s5 }]}>
        <Pill label={t('result.share')} tone="light" onPress={share} />
        <Pill
          label={t('result.again')}
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
