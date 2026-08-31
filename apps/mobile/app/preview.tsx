import type { CatalogueResponse } from '@loxa/shared';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assetUrl } from '@/api/assets';
import { ColorStrip } from '@/components/ColorStrip';
import { CreditChip } from '@/components/CreditChip';
import { PhotoPlate } from '@/components/PhotoPlate';
import { Pill } from '@/components/Pill';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StyleStrip } from '@/components/StyleStrip';
import { Body, Meta } from '@/components/Text';
import { Wordmark } from '@/components/Wordmark';
import { verdictLine, type FaceVerdict } from '@/face/verdict';
import { pickFromLibrary } from '@/photo';
import { adjacentStyle, clampSelection, colorsFor, findColor, findStyle, heroKeys } from '@/catalogue';
import { initialSelection, primaryAction, primaryActionLabel, withSource } from '@/selection';
import { useCatalogue } from '@/store/catalogue';
import { useCredits } from '@/store/credits';
import { offerPortrait } from '@/store/portrait-offer';
import { readProfilePhoto } from '@/store/profile-photo';
import { color, radius, space } from '@/theme';

/**
 * The main screen, and the only one the user really lives on.
 *
 * A photograph, a style, a colour, and one button. Everything else on it — the
 * credit chip, the source toggle, the strip headers — is there to make the cost
 * and the inputs of that button legible before it is pressed.
 */
export default function Preview() {
  const { status, catalogue, reload } = useCatalogue();

  // The catalogue decides what the strips hold and what the screen opens on, so
  // there is no honest version of this screen without one. Splitting the gate
  // from the body is what keeps `Selection` non-nullable: every control below
  // can assume a style and a colour that exist, rather than carrying a `| null`
  // through the badge, both strips and the button for a moment in which none of
  // them are on screen.
  if (status === 'ready') return <PreviewReady catalogue={catalogue} />;
  return <PreviewPlaceholder offline={status === 'unavailable'} onRetry={reload} />;
}

/**
 * The screen before the catalogue arrives, and if it never does.
 *
 * Built out of the same plate, pill and captions as the real thing rather than
 * out of a spinner: the app owns no `ActivityIndicator`, and its only waiting
 * object is the progress bar, which is for a render of known length. The
 * hatched plate already means "a picture goes here", which is exactly true.
 *
 * The controls stay in place, disabled, so nothing reflows when the catalogue
 * lands. The strips are omitted — an empty strip header over nothing reads as
 * a broken screen, where no strip reads as one still loading.
 */
function PreviewPlaceholder({ offline, onRetry }: { offline: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.s4 }]}>
      <View style={styles.header}>
        <Wordmark variant="wordmarkSmall" />
      </View>

      <View style={styles.plateWrap}>
        <PhotoPlate
          label={offline ? t('preview.catalogueUnavailable') : undefined}
          style={styles.plate}
        />
      </View>

      <View style={styles.controls}>
        {offline ? (
          <>
            <Pill label={t('common.tryAgain')} onPress={onRetry} />
            <Meta variant="note" tone="ink45" sentence style={styles.centred}>
              {t('preview.needsConnection')}
            </Meta>
          </>
        ) : (
          <Pill label={t('preview.tryOn')} cost={1} disabled onPress={() => {}} />
        )}
      </View>
    </View>
  );
}

function PreviewReady({ catalogue }: { catalogue: CatalogueResponse }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { credits, refresh } = useCredits();
  const [selection, setSelection] = useState(() => initialSelection(catalogue.defaults));
  const [photo, setPhoto] = useState<{ base64: string; uri: string } | null>(null);
  // Why the last photo they chose was turned away, if it was. Cleared by the
  // next one that isn't — including the one the camera hands back.
  const [rejected, setRejected] = useState<FaceVerdict | null>(null);
  // The plate is a pager, and a pager needs to know how wide one page is. Zero
  // until the first layout, which is why the plain plate renders until then.
  const [plateWidth, setPlateWidth] = useState(0);
  const [page, setPage] = useState(0);
  const pager = useRef<ScrollView>(null);
  // Which end of the new style's pages to land on, once a swipe off the edge
  // has changed the style and the new pages have been laid out.
  const [landing, setLanding] = useState<'first' | 'last' | null>(null);
  // The portrait behind the header avatar, if one has been taken. Read on focus
  // because the profile is where it is set, and this screen is what the user
  // comes back to afterwards.
  const [portrait, setPortrait] = useState<string | null>(null);

  // The camera hands the shot back through the router rather than through a
  // store: it is one value, used once, on the way back to exactly this screen.
  const params = useLocalSearchParams<{ photoUri?: string; photoBase64?: string }>();
  useEffect(() => {
    if (params.photoUri && params.photoBase64) {
      setPhoto({ uri: params.photoUri, base64: params.photoBase64 });
      setRejected(null);
      setSelection((current) => ({ ...current, source: 'new', hasFreshShot: true, hasPhoto: true }));
    }
  }, [params.photoUri, params.photoBase64]);

  // A refresh in the background can withdraw the cut being looked at, and
  // choosing a style never rendered in the current colour is the same problem
  // from the other side. Both would leave a named look over an empty plate.
  useEffect(() => {
    setSelection((current) => clampSelection(current, catalogue));
  }, [catalogue]);

  const style = findStyle(catalogue, selection.styleId);
  const colorName = findColor(catalogue, selection.colorId)?.name ?? '';

  /**
   * The user's own face first, then the models wearing the same cut and colour.
   *
   * Theirs leads because it is the point of the app — the models are there to
   * show what the cut looks like before they have committed a photo to it, and
   * to stop the plate being an empty rectangle on a first run. With no photo and
   * no asset host configured this is empty, and the plate falls back to the
   * labelled placeholder it has always drawn.
   */
  const pages = [
    ...(photo ? [{ key: 'photo', uri: photo.uri, focus: undefined }] : []),
    ...heroKeys(catalogue, selection.styleId, selection.colorId)
      .map((key) => ({
        key: `model-${key}`,
        uri: assetUrl(key),
        // Where this render's head sits. The user's own photo has no entry and
        // does not want one — it is already framed by whoever took it.
        focus: catalogue.focus?.[key],
      }))
      .filter(
        (
          model,
        ): model is {
          key: string;
          uri: string;
          focus: { top: number; bottom: number } | undefined;
        } => model.uri !== undefined,
      ),
  ];

  /**
   * Walk to the neighbouring cut, having been swiped off the end of this one.
   *
   * It lands on a model rather than on page zero, which is the user's own
   * untouched photograph and looks identical under every cut — arriving there
   * would read as the swipe having done nothing at all. Forwards lands on the
   * first model and backwards on the last, so the models carry on in the
   * direction the finger was going.
   */
  function stepStyle(step: 1 | -1) {
    const next = adjacentStyle(catalogue, selection.styleId, step);
    if (!next) return;
    setSelection((current) => clampSelection({ ...current, styleId: next.id }, catalogue));
    setLanding(step === 1 ? 'first' : 'last');
  }

  // The pages are new objects on every render, so this leans on `landing` alone
  // to fire once: it is cleared here, and only a swipe off an edge sets it.
  useEffect(() => {
    if (!landing || plateWidth === 0) return;
    const firstModel = pages.findIndex((item) => item.key !== 'photo');
    const target = Math.max(landing === 'first' ? firstModel : pages.length - 1, 0);
    pager.current?.scrollTo({ x: target * plateWidth, animated: false });
    setPage(target);
    setLanding(null);
  }, [landing, pages, plateWidth]);

  const choosePhoto = useCallback(async () => {
    const picked = await pickFromLibrary();
    if (!picked) return;
    if (!picked.ok) {
      // The photo they already had, if any, stays. Losing a good photo because
      // the next one had nobody in it would be the worse of the two failures.
      setRejected(picked.reason);
      return;
    }
    setRejected(null);
    setPhoto(picked.photo);
    setSelection((current) => ({ ...current, hasPhoto: true }));
  }, []);

  // The balance changes while this screen is not the one on top: a render spends
  // one, a purchase on the paywall adds one. Without this the chip goes stale
  // after a purchase — the user pays, comes back, and sees the same zero.
  useFocusEffect(
    useCallback(() => {
      void refresh();
      void readProfilePhoto().then(setPortrait);
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
        // Armed here rather than after the render, because this is the only
        // screen holding both halves of the photo. It is consumed on the result
        // screen, which is reached only once a render has been billed and
        // saved — so a failure never turns into an ask.
        offerPortrait(photo);
        router.push({
          pathname: '/generating',
          params: {
            base64: photo.base64,
            styleId: selection.styleId,
            colorId: selection.colorId,
            // The names travel with the render rather than being looked up
            // again downstream. A look outlives the manifest that described it,
            // and a saved picture must not lose its caption because a cut was
            // withdrawn months later.
            styleName: style?.name ?? selection.styleId,
            colorName,
          },
        });
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.s4 }]}>
      <View style={styles.header}>
        <Wordmark variant="wordmarkSmall" />
        <View style={styles.headerRight}>
          <CreditChip credits={credits?.creditsLeft ?? 0} onPress={() => router.push('/profile')} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(portrait ? 'preview.profile' : 'preview.setUpProfile')}
            onPress={() => router.push('/profile')}
          >
            <PhotoPlate uri={portrait} style={styles.avatar} />
            {portrait ? null : <PlusBadge />}
          </Pressable>
        </View>
      </View>

      <View style={styles.plateWrap} onLayout={(e) => setPlateWidth(e.nativeEvent.layout.width)}>
        {pages.length > 0 && plateWidth > 0 ? (
          <ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setPage(Math.round(e.nativeEvent.contentOffset.x / plateWidth))
            }
            // Dragging past either end changes the cut. The bounce is the
            // affordance: it is the one place the plate can be pulled to
            // where there is nothing to see, so it is worth something.
            onScrollEndDrag={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const pull = plateWidth * 0.15;
              if (x < -pull) stepStyle(-1);
              else if (x > (pages.length - 1) * plateWidth + pull) stepStyle(1);
            }}
            style={styles.pager}
          >
            {pages.map((item) => (
              <Pressable key={item.key} onPress={choosePhoto} style={{ width: plateWidth }}>
                <PhotoPlate uri={item.uri} focus={item.focus} style={styles.plate} />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Pressable onPress={choosePhoto} style={styles.plate}>
            <PhotoPlate
              uri={photo?.uri}
              label={
                photo ? undefined : t(rejected ? verdictLine(rejected) : 'preview.tapToChoose')
              }
              style={styles.plate}
            />
          </Pressable>
        )}

        <View style={styles.badge} pointerEvents="none">
          <Body variant="tile" weight="medium">
            {style?.name} · {colorName}
          </Body>
        </View>

        {pages.length > 1 ? (
          <View style={styles.dots} pointerEvents="none">
            {pages.map((item, index) => (
              <View
                key={item.key}
                style={[styles.dot, index === page ? styles.dotOn : styles.dotOff]}
              />
            ))}
          </View>
        ) : null}

        {rejected && photo ? (
          <View style={styles.rejected} pointerEvents="none">
            <Meta variant="note" tone="ink" sentence>
              {t(verdictLine(rejected))}
            </Meta>
          </View>
        ) : null}
      </View>

      <View style={styles.controls}>
        <SegmentedControl
          value={selection.source}
          onChange={(source) => setSelection((current) => withSource(current, source))}
          options={[
            { value: 'saved', label: t('preview.savedPhoto') },
            {
              value: 'new',
              label: t(selection.hasFreshShot ? 'preview.newPhotoTaken' : 'preview.newPhoto'),
            },
          ]}
        />

        <Pill label={t(primaryActionLabel(selection))} cost={1} onPress={onPrimary} />
      </View>

      <ScrollView
        style={styles.strips}
        contentContainerStyle={[styles.stripsContent, { paddingBottom: insets.bottom + space.s6 }]}
        showsVerticalScrollIndicator={false}
      >
        <StyleStrip
          catalogue={catalogue}
          selectedId={selection.styleId}
          onSelect={(styleId) => setSelection((current) => ({ ...current, styleId }))}
        />
        <ColorStrip
          colors={colorsFor(catalogue, selection.styleId)}
          selectedId={selection.colorId}
          onSelect={(colorId) => setSelection((current) => ({ ...current, colorId }))}
        />
      </ScrollView>
    </View>
  );
}

/**
 * The empty avatar's invitation.
 *
 * The same object as the one on the profile's identity block, at a third the
 * size: an ink disc with a plus, ringed in paper so it reads over whatever is
 * behind it. Without it the header carries a flat grey circle, which says
 * nothing — least of all that there is a profile photo to add.
 *
 * The plus is two bars rather than a glyph. At fifteen points a typeface's ＋
 * is a hinting lottery; two rectangles are the same on every phone.
 */
function PlusBadge() {
  return (
    <View style={styles.badgeRing} pointerEvents="none">
      <View style={styles.plusBar} />
      <View style={[styles.plusBar, styles.plusBarUp]} />
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
    borderWidth: 1,
    borderColor: color.ink12,
  },
  badgeRing: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 15,
    height: 15,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    borderWidth: 1.5,
    borderColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBar: {
    position: 'absolute',
    width: 7,
    height: 1.5,
    backgroundColor: color.paper,
  },
  plusBarUp: { transform: [{ rotate: '90deg' }] },
  plateWrap: { flex: 1, marginHorizontal: space.gutterScreen },
  // Over the photo they kept, because the plate's own label only shows when
  // there is no photo under it. Wearing the badge's plate for the same reason
  // the badge does: this text has a photograph behind it.
  rejected: {
    position: 'absolute',
    bottom: space.s3,
    alignSelf: 'center',
    height: 26,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(250,248,245,0.9)',
    justifyContent: 'center',
  },
  plate: { flex: 1 },
  pager: { flex: 1, borderRadius: radius.plate },
  // A capsule, like the badge: the dots have to read over whatever the photo is.
  dots: {
    position: 'absolute',
    bottom: space.s3,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    height: 18,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(250,248,245,0.5)',
    gap: space.s1 + 2,
  },
  dot: { height: 6, borderRadius: radius.pill },
  dotOn: { width: 16, backgroundColor: color.ink },
  dotOff: { width: 6, backgroundColor: color.ink30 },
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
  centred: { textAlign: 'center' },
  strips: { flexGrow: 0, marginTop: space.gutterText },
  stripsContent: { gap: space.s3 },
});
