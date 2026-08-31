import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera as VisionCamera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
  type TargetCameraPosition,
} from 'react-native-vision-camera';
import { FaceConstellation } from '@/components/FaceConstellation';
import { FlipIcon } from '@/components/FlipIcon';
import { Pill } from '@/components/Pill';
import { Body, Meta } from '@/components/Text';
import { idleGeometry, type FaceGeometry } from '@/face/geometry';
import { verdictLine, type FaceVerdict } from '@/face/verdict';
import { pickFromLibrary, prepare, type PreparedPhoto } from '@/photo';
import { saveProfilePhoto } from '@/store/profile-photo';
import { color, radius, space } from '@/theme';

/**
 * Taking the photo.
 *
 * The oval and the line under it are the whole quality-control story for now:
 * a centred face in even light is most of what makes a render good, and saying
 * so before the shutter is cheaper than a failed generation afterwards.
 *
 * The constellation over it is decoration and nothing more — it gates no
 * shutter and reaches no Worker. It used to be drawn on a face MLKit had found,
 * which cost the app a native binary with no simulator slice; it is now drawn
 * inside the oval instead. What it buys is the same either way: the moment
 * before the shutter reading as *this app is looking at me*, which is the
 * promise the render then has to keep.
 *
 * The face is checked once, on the photo, in `prepare` — after the shutter and
 * after the picker both. A shot with nobody in it does not leave this screen.
 *
 * Front camera by default, because the photo is of the person holding the phone.
 *
 * Two callers, one screen. From the preview the shot is handed back through the
 * router and used once; from the profile it is written down as the portrait and
 * the screen simply closes. Only the title and what happens after the shutter
 * differ — the oval, the check and the library button are the same question
 * either way.
 */

/** The guide oval's frame, from `styles.guide`. Both live or neither does. */
const GUIDE_INSET = 52;
const GUIDE_TOP = 0.16;
const GUIDE_BOTTOM = 0.22;

export default function Camera() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // `canRequestPermission` is the difference between a prompt and a dead
  // button. iOS asks once and only once: after a refusal `requestPermission`
  // resolves false having shown nothing, so past that point the only way back
  // is Settings and the button has to say so.
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();
  // The viewfinder is live hardware. It runs while this screen is in front and
  // not a moment longer — behind the library sheet, on the way to the profile,
  // or with the app in the background it is off, which is both the battery and
  // the green dot in the status bar.
  const focused = useIsFocused();
  const foreground = useAppActive();
  const active = focused && foreground;
  // The cut and colour ride along untouched. They belong to the screen that
  // sent the user here and to the one waiting on the other side; this screen
  // has no opinion about them and only has to not drop them.
  const { from, styleId, colorId } = useLocalSearchParams<{
    from?: string;
    styleId?: string;
    colorId?: string;
  }>();
  const forProfile = from === 'profile';
  const [facing, setFacing] = useState<TargetCameraPosition>('front');

  const device = useCameraDevice(facing);
  const photoOutput = usePhotoOutput({ qualityPrioritization: 'quality' });

  const [geometry, setGeometry] = useState<FaceGeometry | null>(null);
  const [rejected, setRejected] = useState<FaceVerdict | null>(null);

  // The oval is a fraction of the viewfinder, and the viewfinder is a fraction
  // of the window, so neither is known until the layout arrives. Once it has,
  // the constellation is a pure function of it — computed here, and not again
  // until the box changes size.
  const onViewfinderLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (!width || !height) return;
    setGeometry(
      idleGeometry({
        x: GUIDE_INSET,
        y: height * GUIDE_TOP,
        width: width - GUIDE_INSET * 2,
        height: height * (1 - GUIDE_TOP - GUIDE_BOTTOM),
      }),
    );
  }, []);

  async function snap() {
    const shot = await photoOutput.capturePhotoToFile({ enableShutterSound: true }, {});

    // `filePath` is a filesystem path, not a URL, and the manipulator wants one.
    const result = await prepare(`file://${shot.filePath}`, { unmirror: facing === 'front' });
    if (!result.ok) {
      // Stay here. They are already pointing a camera at something, and the
      // fastest fix for a shot with nobody in it is the next shot.
      setRejected(result.reason);
      return;
    }
    setRejected(null);
    await handOff(result.photo);
  }

  async function fromLibrary() {
    const result = await pickFromLibrary();
    if (!result) return;
    if (!result.ok) {
      setRejected(result.reason);
      return;
    }
    setRejected(null);
    await handOff(result.photo);
  }

  async function handOff(photo: PreparedPhoto) {
    if (forProfile) {
      await saveProfilePhoto(photo.base64);
      // Back rather than replace: the profile pushed this screen and re-reads
      // the portrait when it comes forward again.
      router.back();
      return;
    }
    // Replace rather than push: this screen has done its job, and leaving it
    // in the stack would put a live viewfinder behind the confirm screen and a
    // second camera between confirm and the preview underneath it.
    router.replace({
      pathname: '/confirm',
      params: { photoUri: photo.uri, photoBase64: photo.base64, styleId, colorId },
    });
  }

  if (!hasPermission) {
    return (
      <View style={[styles.screen, styles.ask, { paddingTop: insets.top + space.s10 }]}>
        <Meta tone="paper60">{t('camera.permission')}</Meta>
        <Body tone="paper66" style={styles.askText}>
          {t(canRequestPermission ? 'camera.permissionBody' : 'camera.permissionDenied')}
        </Body>
        <Pill
          label={t(canRequestPermission ? 'camera.allow' : 'camera.openSettings')}
          tone="light"
          onPress={canRequestPermission ? requestPermission : () => Linking.openSettings()}
        />
        <Pill label={t('camera.chooseFromLibrary')} tone="quietOnNight" onPress={fromLibrary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.viewfinder, { top: insets.top + space.s3 }]} onLayout={onViewfinderLayout}>
        {device ? (
          <VisionCamera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={active}
            resizeMode="cover"
            mirrorMode="auto"
            outputs={[photoOutput]}
          />
        ) : null}
        <FaceConstellation geometry={geometry} />
        <View style={styles.guide} pointerEvents="none" />
        <Meta
          variant="note"
          tone={rejected ? 'paper85' : 'paper60'}
          sentence
          style={styles.hint}
        >
          {t(rejected ? verdictLine(rejected) : 'camera.hint')}
        </Meta>
      </View>

      <View style={[styles.header, { top: insets.top + space.s4 }]}>
        {/* Centred on the screen rather than in what is left of the row, so the
            title does not shift when the close button is the only thing beside
            it. */}
        <Meta tone="paper60" style={styles.headerTitle}>
          {t(forProfile ? 'camera.titleProfile' : 'camera.title')}
        </Meta>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('camera.close')}
          onPress={() => router.back()}
          style={styles.round}
        >
          <Body tone="paper">✕</Body>
        </Pressable>
      </View>

      <View style={[styles.controls, { bottom: insets.bottom + space.s5 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('camera.chooseFromLibrary')}
          onPress={fromLibrary}
          hitSlop={space.s4}
          style={[styles.side, styles.library]}
        >
          <Meta variant="metaLarge" tone="paper60">
            {t('camera.library')}
          </Meta>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel={t('camera.takePhoto')} onPress={snap} style={styles.shutterRing}>
          <View style={styles.shutter} />
        </Pressable>

        <View style={styles.side}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('camera.flip')}
            onPress={() => setFacing((current) => (current === 'front' ? 'back' : 'front'))}
            style={styles.flip}
          >
            <FlipIcon size={30} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/**
 * Whether the app is in the foreground.
 *
 * `useCameraPermission` already re-reads its status on this event, which is
 * what makes the trip to Settings and back land on a working viewfinder rather
 * than on the same wall.
 */
function useAppActive(): boolean {
  const [state, setState] = useState(() => AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) =>
      setState(next === 'active'),
    );
    return () => subscription.remove();
  }, []);

  return state;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b0a0a' },
  ask: { paddingHorizontal: space.gutterHero, gap: space.s4 },
  askText: { marginBottom: space.s2 },
  viewfinder: {
    position: 'absolute',
    left: space.s3,
    right: space.s3,
    bottom: 200,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: color.nightRaised,
  },
  guide: {
    position: 'absolute',
    left: 52,
    right: 52,
    top: '16%',
    bottom: '22%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 140,
  },
  hint: { position: 'absolute', left: 0, right: 0, bottom: space.gutterText, textAlign: 'center' },
  header: {
    position: 'absolute',
    left: space.gutterTextWide,
    right: space.gutterTextWide,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerTitle: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  round: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    position: 'absolute',
    left: space.s6,
    right: space.s6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // The word, and nothing around it. The tile it used to sit in was a hatched
  // square that read as a thumbnail with no picture in it — an empty slot where
  // this is an action.
  library: { justifyContent: 'center' },
  shutterRing: {
    width: 74,
    height: 74,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    padding: 5,
  },
  shutter: { flex: 1, borderRadius: radius.pill, backgroundColor: color.paper },
  // The word and the button are given the same width, so the shutter sits on
  // the centre line rather than wherever the longer of the two leaves it —
  // "LIBRARY" is wider than a 64pt circle, and in German it is wider still.
  side: { width: 96 },
  flip: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
});
