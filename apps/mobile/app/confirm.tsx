import type { CatalogueResponse } from '@loxa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assetUrl } from '@/api/assets';
import { Chevron } from '@/components/Chevron';
import { ColorStrip } from '@/components/ColorStrip';
import { PhotoPlate } from '@/components/PhotoPlate';
import { Pill } from '@/components/Pill';
import { Body, Meta } from '@/components/Text';
import { adjacentStyle, clampPair, colorsFor, findColor, findStyle, heroKeys } from '@/catalogue';
import { useCatalogue } from '@/store/catalogue';
import { useCredits } from '@/store/credits';
import { offerPortrait } from '@/store/portrait-offer';
import { readProfilePhoto, readProfilePhotoForRender } from '@/store/profile-photo';
import { color, radius, space } from '@/theme';

/**
 * What the shot is and where it came from. `saved` carries no photo.
 *
 * A type rather than an interface: `useLocalSearchParams` constrains its
 * generic to a record, and only a type alias picks up the implicit index
 * signature that satisfies it.
 */
type Params = {
  photoUri?: string;
  photoBase64?: string;
  styleId: string;
  colorId: string;
  source?: string;
};

/**
 * The screen between choosing and spending.
 *
 * Everything before this one browses; this one commits. The preview screen used
 * to do both, which meant a credit was spent from the same place a user was
 * still making up their mind, and — because the camera came back to it with
 * `router.replace` — spent on a cut and colour that had been reset to the
 * catalogue's defaults on the way.
 *
 * The camera now replaces itself with this screen instead, so the stack is
 * `[preview, confirm]`: the preview underneath is never unmounted, and going
 * back lands on the selection the user left rather than on a second copy of the
 * screen holding none of it.
 *
 * The model is large and the user's own photograph is the inset. That is the
 * right way round for a decision — the model is what is being chosen, and the
 * photo is there to confirm the right shot was taken. It reverses on the result
 * screen, where their face is the whole point.
 *
 * Split at the catalogue for the same reason the preview screen is: there is no
 * honest version of this screen without one, and gating here is what lets
 * everything below assume a cut and a colour that exist.
 */
export default function Confirm() {
  const params = useLocalSearchParams<Params>();
  const { status, catalogue } = useCatalogue();

  if (status !== 'ready') return <View style={styles.screen} />;
  return <ConfirmReady catalogue={catalogue} params={params} />;
}

function ConfirmReady({ catalogue, params }: { catalogue: CatalogueResponse; params: Params }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { credits } = useCredits();

  // The shot travels through the router, exactly as it did to the preview
  // screen: one value, used once, on the way to one place. The portrait is on
  // disk instead, and is read here rather than sent.
  const fromCamera = params.source !== 'saved';

  const [pair, setPair] = useState(() =>
    clampPair(catalogue, params.styleId, params.colorId),
  );
  const [plateWidth, setPlateWidth] = useState(0);
  const [portrait, setPortrait] = useState<string | null>(null);
  const pager = useRef<ScrollView>(null);

  useEffect(() => {
    if (!fromCamera) void readProfilePhoto().then(setPortrait);
  }, [fromCamera]);

  // A background refresh can withdraw the cut being confirmed while it is on
  // screen. Same rule as the swipe below, arriving from the other direction.
  useEffect(() => {
    setPair((current) => {
      const next = clampPair(catalogue, current.styleId, current.colorId);
      return next.styleId === current.styleId && next.colorId === current.colorId ? current : next;
    });
  }, [catalogue]);

  const style = findStyle(catalogue, pair.styleId);
  const colorName = findColor(catalogue, pair.colorId)?.name ?? '';
  const own = fromCamera ? params.photoUri : portrait;
  const hero = heroKeys(catalogue, pair.styleId, pair.colorId)[0];
  const heroUri = hero ? assetUrl(hero) : undefined;

  /**
   * Walk to the neighbouring cut, holding the colour.
   *
   * The colour is what the user has already decided; the cut is what this
   * gesture is for. `clampPair` catches the case where the two disagree — a
   * neighbour never rendered in this colour — rather than this screen guessing.
   */
  function stepStyle(step: 1 | -1) {
    const next = adjacentStyle(catalogue, pair.styleId, step);
    if (!next) return;
    setPair(clampPair(catalogue, next.id, pair.colorId));
    pager.current?.scrollTo({ x: 0, animated: false });
  }

  async function onTryOn() {
    // The Worker's check is the authority and always runs, spending before the
    // model call. This one exists so somebody at zero does not watch a progress
    // bar that was never going to finish. Null is still loading and goes
    // through: guessing "no" puts a paywall in front of a paying subscriber.
    const left = credits?.creditsLeft ?? null;
    if (left !== null && left < 1) {
      router.push('/paywall');
      return;
    }

    const shot =
      fromCamera && params.photoUri && params.photoBase64
        ? { uri: params.photoUri, base64: params.photoBase64 }
        : fromCamera
          ? null
          : await readProfilePhotoForRender();
    if (!shot) return;

    // Consumed on the result screen, which is reached only once a render has
    // been billed and saved. Only for a fresh shot: offering the portrait as
    // the portrait is a question with one answer.
    if (fromCamera) offerPortrait(shot);

    router.push({
      pathname: '/generating',
      params: {
        base64: shot.base64,
        styleId: pair.styleId,
        colorId: pair.colorId,
        // The names travel with the render rather than being looked up again
        // downstream. A look outlives the manifest that described it.
        styleName: style?.name ?? pair.styleId,
        colorName,
      },
    });
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.s4 }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          style={styles.round}
        >
          <Chevron />
        </Pressable>
        <Meta>{t('confirm.title')}</Meta>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.plateWrap} onLayout={(e) => setPlateWidth(e.nativeEvent.layout.width)}>
        {/*
          A one-page pager, which exists for its edges rather than its pages.
          Dragging past either end steps the cut — the same gesture and the same
          15% threshold as the preview plate, so the two screens answer a swipe
          the same way.
        */}
        {plateWidth > 0 ? (
          <ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScrollEndDrag={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const pull = plateWidth * 0.15;
              if (x < -pull) stepStyle(-1);
              else if (x > pull) stepStyle(1);
            }}
            style={styles.pager}
          >
            <View style={{ width: plateWidth }}>
              <PhotoPlate
                uri={heroUri}
                focus={hero ? catalogue.focus?.[hero] : undefined}
                style={styles.plate}
              />
            </View>
          </ScrollView>
        ) : (
          <PhotoPlate
            uri={heroUri}
            focus={hero ? catalogue.focus?.[hero] : undefined}
            style={styles.plate}
          />
        )}

        <View style={styles.badge} pointerEvents="none">
          <Body variant="tile" weight="medium">
            {style?.name} · {colorName}
          </Body>
        </View>

        {/*
          The photo about to be restyled, small and in the corner. It is not a
          control — there is no changing it from here, only going back — so it
          takes no press, and carries its label for a screen reader alone.
        */}
        <View
          accessible
          accessibilityLabel={t('confirm.yourPhoto')}
          style={styles.inset}
          pointerEvents="none"
        >
          <PhotoPlate uri={own} style={styles.insetPlate} />
        </View>
      </View>

      <Meta variant="note" tone="ink45" sentence style={styles.hint}>
        {t('confirm.swipeHint')}
      </Meta>

      <View style={[styles.controls, { paddingBottom: insets.bottom + space.s4 }]}>
        <ColorStrip
          colors={colorsFor(catalogue, pair.styleId)}
          selectedId={pair.colorId}
          onSelect={(colorId) => setPair((current) => ({ ...current, colorId }))}
        />

        <Pill label={t('preview.tryOn')} cost={1} onPress={onTryOn} />
      </View>
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
  round: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.ink12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Balances the back button so `space-between` centres the title, and takes
  // none of its border — the same pair as the profile and language headers.
  headerSpacer: { width: 34, height: 34 },
  plateWrap: { flex: 1, marginHorizontal: space.gutterScreen },
  pager: { flex: 1, borderRadius: radius.plate },
  plate: { flex: 1 },
  // Wearing the paper capsule the preview badge wears, for the same reason:
  // this text has a photograph behind it.
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
  // Ringed in paper so it reads as a separate picture rather than as part of
  // the render behind it.
  inset: {
    position: 'absolute',
    right: space.s3,
    bottom: space.s3,
    borderRadius: radius.tile,
    borderWidth: 2,
    borderColor: color.paper,
    overflow: 'hidden',
  },
  insetPlate: { width: 76, height: 101, borderRadius: radius.tile },
  hint: { textAlign: 'center', paddingTop: space.s3 },
  controls: {
    paddingHorizontal: space.gutterScreen,
    paddingTop: space.s3,
    gap: space.s3,
  },
});
