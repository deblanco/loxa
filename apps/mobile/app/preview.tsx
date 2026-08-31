import type { CatalogueResponse } from '@loxa/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assetUrl } from '@/api/assets';
import { ColorStrip } from '@/components/ColorStrip';
import { CreditChip } from '@/components/CreditChip';
import { PersonMark } from '@/components/PersonMark';
import { PhotoPlate } from '@/components/PhotoPlate';
import { Pill } from '@/components/Pill';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StyleStrip } from '@/components/StyleStrip';
import { Body, Display, Meta } from '@/components/Text';
import { Wordmark } from '@/components/Wordmark';
import { adjacentStyle, clampSelection, colorsFor, findColor, findStyle, heroKeys } from '@/catalogue';
import { initialSelection, primaryAction, primaryActionLabel, withSource } from '@/selection';
import { useCatalogue } from '@/store/catalogue';
import { useCredits } from '@/store/credits';
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
 * Two states that look nothing alike, because they are not the same news.
 *
 * Waiting keeps the plate, the pill and the layout of the real thing, disabled:
 * the app owns no `ActivityIndicator`, its only waiting object is the progress
 * bar, and the hatch already means "a picture goes here", which is exactly true
 * while one is on its way. Nothing reflows when the catalogue lands. The strips
 * are omitted — an empty strip header over nothing reads as a broken screen,
 * where no strip reads as one still loading.
 *
 * Offline drops the plate entirely. Nothing is going to arrive in it, so a
 * full-height hatch would be the one thing the design system says it is not: a
 * failed load dressed as a placeholder. What is left is a statement in the
 * serif, the reason underneath it in mono, and the one control that can change
 * the situation — the same shape as the entry screen, which is the other screen
 * the app shows before it has anything of the user's to show.
 */
function PreviewPlaceholder({ offline, onRetry }: { offline: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (offline) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + space.s4 }]}>
        <View style={styles.header}>
          <Wordmark variant="wordmarkSmall" />
        </View>

        <View style={styles.offline}>
          <Display variant="displayS">{t('preview.offlineHeadline')}</Display>
          <Display variant="displayS" italic style={styles.offlineSecond}>
            {t('preview.offlineHeadlineItalic')}
          </Display>
          <Meta variant="note" tone="ink45" sentence style={styles.offlineNote}>
            {t('preview.needsConnection')}
          </Meta>
        </View>

        <View style={[styles.controls, { paddingBottom: insets.bottom + space.s5 }]}>
          <Pill label={t('common.tryAgain')} onPress={onRetry} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.s4 }]}>
      <View style={styles.header}>
        <Wordmark variant="wordmarkSmall" />
      </View>

      <View style={styles.plateWrap}>
        <PhotoPlate style={styles.plate} />
      </View>

      <View style={styles.controls}>
        <Pill label={t('preview.tryOn')} cost={1} disabled onPress={() => {}} />
      </View>
    </View>
  );
}

function PreviewReady({ catalogue }: { catalogue: CatalogueResponse }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { credits, refresh } = useCredits();
  const [selection, setSelection] = useState(() => initialSelection(catalogue.defaults));
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

  // A refresh in the background can withdraw the cut being looked at, and
  // choosing a style never rendered in the current colour is the same problem
  // from the other side. Both would leave a named look over an empty plate.
  useEffect(() => {
    setSelection((current) => clampSelection(current, catalogue));
  }, [catalogue]);

  const style = findStyle(catalogue, selection.styleId);
  const colorName = findColor(catalogue, selection.colorId)?.name ?? '';

  /**
   * The models wearing the cut and colour, and nothing else.
   *
   * The user's own face is deliberately not here. This screen is the catalogue:
   * it shows what a cut looks like, which is what somebody choosing one needs
   * to see. Their photograph belongs on the confirm screen, where it sits under
   * the model as the thing about to be restyled — showing it here as well made
   * the first page of the pager their own unchanged face, which says nothing
   * about the cut they are looking at.
   *
   * With no asset host configured this is empty, and the plate falls back to
   * the labelled placeholder it has always drawn.
   */
  const pages = [
    ...heroKeys(catalogue, selection.styleId, selection.colorId)
      .map((key) => ({
        key: `model-${key}`,
        uri: assetUrl(key),
        // Where this render's head sits, so the plate can centre on the band
        // that matters rather than on the middle of the frame.
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
   * Forwards lands on the new cut's first model and backwards on its last, so
   * the models carry on in the direction the finger was going rather than
   * snapping back to the start of the strip.
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
    const target = landing === 'first' ? 0 : Math.max(pages.length - 1, 0);
    pager.current?.scrollTo({ x: target * plateWidth, animated: false });
    setPage(target);
    setLanding(null);
  }, [landing, pages, plateWidth]);

  // `hasPhoto` only ever asks about the portrait now: `new` is answered by the
  // camera before the question arises. Kept in the selection so `selection.ts`
  // never has to know where a picture is kept.
  useEffect(() => {
    const has = portrait !== null;
    setSelection((current) => (current.hasPhoto === has ? current : { ...current, hasPhoto: has }));
  }, [portrait]);

  // The balance changes while this screen is not the one on top: a render spends
  // one, a purchase on the paywall adds one. Without this the chip goes stale
  // after a purchase — the user pays, comes back, and sees the same zero.
  useFocusEffect(
    useCallback(() => {
      void refresh();
      void readProfilePhoto().then(setPortrait);
    }, [refresh]),
  );

  const action = primaryAction(selection);

  // The plate leads wherever the button leads, except when the button would
  // render: there the plate is already showing what that render starts from,
  // and a tap that spends a credit is not a tap anybody meant to make.
  const onPlate = action === 'generate' ? undefined : onPrimary;

  function onPrimary() {
    switch (action) {
      case 'camera':
        // The cut and colour travel with the user. The camera does not read
        // them; it hands them to the confirm screen on the other side, which is
        // what stops a shot coming back wearing the catalogue's defaults.
        router.push({
          pathname: '/camera',
          params: { styleId: selection.styleId, colorId: selection.colorId },
        });
        return;
      case 'profile-photo':
        // The camera saves the portrait and comes straight back, so the source
        // this button belongs to has a photo by the time the screen returns.
        router.push('/camera?from=profile');
        return;
      case 'generate':
        // Nothing is spent from this screen any more. The confirm screen owns
        // the credit, and reads the portrait itself — the bytes are around
        // 700KB and have no business being carried across a route by the screen
        // the user lives on.
        router.push({
          pathname: '/confirm',
          params: {
            source: 'saved',
            styleId: selection.styleId,
            colorId: selection.colorId,
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
            <PhotoPlate
              uri={portrait}
              placeholder={<PersonMark />}
              style={styles.avatar}
            />
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
              <Pressable key={item.key} onPress={onPlate} style={{ width: plateWidth }}>
                <PhotoPlate uri={item.uri} focus={item.focus} style={styles.plate} />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Pressable onPress={onPlate} style={styles.plate}>
            <PhotoPlate label={t('preview.tapToTakePhoto')} style={styles.plate} />
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
      </View>

      <View style={styles.controls}>
        <SegmentedControl
          value={selection.source}
          onChange={(source) => setSelection((current) => withSource(current, source))}
          options={[
            { value: 'saved', label: t('preview.savedPhoto') },
            { value: 'new', label: t('preview.newPhoto') },
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
 * behind it. The `PersonMark` under it says the circle is the profile; this
 * says the profile has no photograph in it yet, and that tapping is how that
 * changes. Neither says both on its own.
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
  // The statement sits in the space the plate used to fill, off the optical
  // centre so it reads as a held page rather than as a dialog.
  offline: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.gutterScreen,
    paddingBottom: space.s14,
  },
  // The same second-line treatment as the entry headline: the italic carries
  // the emphasis, and a touch of transparency keeps it from outweighing the
  // line it completes.
  offlineSecond: { opacity: 0.82 },
  offlineNote: { marginTop: space.s4 },
  strips: { flexGrow: 0, marginTop: space.gutterText },
  stripsContent: { gap: space.s3 },
});
