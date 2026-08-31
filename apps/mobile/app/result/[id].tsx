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
import {
  acceptPortrait,
  declinePortrait,
  pendingPortrait,
  type OfferedPhoto,
} from '@/store/portrait-offer';
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
  // The photo this look was made from, if it is worth offering as a portrait.
  // Null on a look reopened later — the offer is armed on the preview screen
  // and lives only as long as the render it belongs to.
  const [offer, setOffer] = useState<OfferedPhoto | null>(null);
  // Measured rather than assumed: the question wraps to two lines in German
  // and to one in English, and the caption above has to clear whichever it is.
  const [offerHeight, setOfferHeight] = useState(0);

  useEffect(() => {
    void readLook(id).then(setLook);
    void pendingPortrait().then(setOffer);
  }, [id]);

  // The rating prompt, once the picture is on screen and settled.
  //
  // Delayed rather than immediate because the sheet would otherwise land on top
  // of the thing it is asking about, and cleared on unmount so backing out
  // inside the pause cancels it — an ask that arrives over the preview screen
  // is an ask about nothing. Whether it appears at all is `store/review.ts`'s
  // decision; this only offers it the moment.
  //
  // It also yields to the portrait card below it. Two asks on one screen is one
  // too many, and the sheet would land on top of the card rather than beside
  // it. The portrait is asked at most once per install and the rating prompt
  // has a sixty-day cooldown, so skipping this one result screen costs it
  // nothing.
  useEffect(() => {
    if (!look || offer) return;
    const timer = setTimeout(() => void maybeAskForReview(), 1500);
    return () => clearTimeout(timer);
  }, [look, offer]);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 1600);
  }

  async function keepPortrait() {
    if (!offer) return;
    // Cleared first: the write is the slow half, and leaving the card up while
    // it happens invites a second tap on a photo already being saved.
    setOffer(null);
    await acceptPortrait(offer);
    flash(t('result.portraitSaved'));
  }

  function refusePortrait() {
    setOffer(null);
    void declinePortrait();
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

  // The caption gets out of the card's way rather than the card squeezing in
  // under it. Everything on this screen is anchored to the bottom, so the only
  // way to add a row is to push what is above it up.
  const captionBottom = offer ? ACTIONS_HEIGHT + space.s3 + offerHeight + space.s3 : CAPTION_BOTTOM;

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

      <View style={[styles.caption, { bottom: insets.bottom + captionBottom }]}>
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

      {offer ? (
        <View
          style={[styles.offer, { bottom: insets.bottom + ACTIONS_HEIGHT + space.s3 }]}
          onLayout={(event) => setOfferHeight(event.nativeEvent.layout.height)}
        >
          <View style={styles.offerHead}>
            <PhotoPlate dark uri={offer.uri} style={styles.offerThumb} />
            <Body variant="bodySmall" tone="paper" style={styles.offerLine}>
              {t('result.usePortrait')}
            </Body>
          </View>
          <View style={styles.offerActions}>
            <Pill label={t('result.usePortraitYes')} tone="light" onPress={keepPortrait} style={styles.offerPill} />
            <Pill
              label={t('result.usePortraitNo')}
              tone="quietOnNight"
              onPress={refusePortrait}
              style={styles.offerPill}
            />
          </View>
        </View>
      ) : null}

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

/** The caption's resting place, from the prototype. */
const CAPTION_BOTTOM = 96;

/** The Share / Again block: `space.s5` of clearance, two pills and the gap. */
const ACTIONS_HEIGHT = space.s5 + 56 + (space.s2 + 2) + 46;

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
  offer: {
    position: 'absolute',
    left: space.s6,
    right: space.s6,
    padding: space.s3,
    borderRadius: radius.card,
    backgroundColor: color.paper16,
    gap: space.s3,
  },
  offerHead: { flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  offerThumb: { width: 44, height: 44, borderRadius: radius.pill },
  offerLine: { flex: 1 },
  offerActions: { flexDirection: 'row', alignItems: 'center', gap: space.s2 + 2 },
  offerPill: { flex: 1 },
});
