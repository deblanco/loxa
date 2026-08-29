import type { CatalogueResponse } from '@loxa/shared';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { clampSelection, colorsFor, findColor, findStyle, heroKeys } from '@/catalogue';
import { initialSelection, primaryAction, primaryActionLabel, withSource } from '@/selection';
import { useCatalogue } from '@/store/catalogue';
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
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.s4 }]}>
      <View style={styles.header}>
        <Wordmark variant="wordmarkSmall" />
      </View>

      <View style={styles.plateWrap}>
        <PhotoPlate
          label={offline ? 'the catalogue is not available' : undefined}
          style={styles.plate}
        />
      </View>

      <View style={styles.controls}>
        {offline ? (
          <>
            <Pill label="Try again" onPress={onRetry} />
            <Meta variant="note" tone="ink45" sentence style={styles.centred}>
              loxa needs a connection the first time
            </Meta>
          </>
        ) : (
          <Pill label="Try On" hint="1 credit" disabled onPress={() => {}} />
        )}
      </View>
    </View>
  );
}

function PreviewReady({ catalogue }: { catalogue: CatalogueResponse }) {
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
            accessibilityLabel="Profile"
            onPress={() => router.push('/profile')}
            style={styles.avatar}
          />
        </View>
      </View>

      <View style={styles.plateWrap} onLayout={(e) => setPlateWidth(e.nativeEvent.layout.width)}>
        {pages.length > 0 && plateWidth > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setPage(Math.round(e.nativeEvent.contentOffset.x / plateWidth))
            }
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
              label={photo ? undefined : rejected ? verdictLine(rejected) : 'tap to choose a photo'}
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
          <>
            <View style={styles.dots} pointerEvents="none">
              {pages.map((item, index) => (
                <View
                  key={item.key}
                  style={[styles.dot, index === page ? styles.dotOn : styles.dotOff]}
                />
              ))}
            </View>
            <View style={styles.hint} pointerEvents="none">
              <Meta variant="note" tone="ink40">
                swipe for models
              </Meta>
            </View>
          </>
        ) : null}

        {rejected && photo ? (
          <View style={styles.rejected} pointerEvents="none">
            <Meta variant="note" tone="ink" sentence>
              {verdictLine(rejected)}
            </Meta>
          </View>
        ) : null}
      </View>

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
  // Sits above the hint, which sits above the home indicator's clearance.
  dots: {
    position: 'absolute',
    bottom: space.s3,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space.s1 + 2,
  },
  dot: { height: 4, borderRadius: radius.pill },
  dotOn: { width: 12, backgroundColor: color.ink40 },
  dotOff: { width: 4, backgroundColor: color.ink18 },
  hint: { position: 'absolute', bottom: 26, left: 0, right: 0, alignItems: 'center' },
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
  stripsContent: { gap: space.s5 },
});
