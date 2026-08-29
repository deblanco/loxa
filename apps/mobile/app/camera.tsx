import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera as VisionCamera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
  type TargetCameraPosition,
} from 'react-native-vision-camera';
import { FaceConstellation } from '@/components/FaceConstellation';
import { Pill } from '@/components/Pill';
import { Body, Meta } from '@/components/Text';
import { idleGeometry, type FaceGeometry } from '@/face/geometry';
import { verdictLine, type FaceVerdict } from '@/face/verdict';
import { pickFromLibrary, prepare, type PreparedPhoto } from '@/photo';
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
 */

/** The guide oval's frame, from `styles.guide`. Both live or neither does. */
const GUIDE_INSET = 52;
const GUIDE_TOP = 0.16;
const GUIDE_BOTTOM = 0.22;

export default function Camera() {
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();
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
    handOff(result.photo);
  }

  async function fromLibrary() {
    const result = await pickFromLibrary();
    if (!result) return;
    if (!result.ok) {
      setRejected(result.reason);
      return;
    }
    setRejected(null);
    handOff(result.photo);
  }

  function handOff(photo: PreparedPhoto) {
    router.replace({
      pathname: '/preview',
      params: { photoUri: photo.uri, photoBase64: photo.base64 },
    });
  }

  if (!hasPermission) {
    return (
      <View style={[styles.screen, styles.ask, { paddingTop: insets.top + space.s10 }]}>
        <Meta tone="paper60">Camera</Meta>
        <Body tone="paper66" style={styles.askText}>
          Loxa needs the camera to take the photo it restyles. Nothing is uploaded until you press
          Try On.
        </Body>
        <Pill label="Allow camera" tone="light" onPress={requestPermission} />
        <Pill label="Choose from library" tone="quietOnNight" onPress={fromLibrary} />
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
            isActive
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
          {rejected ? verdictLine(rejected) : 'centre your face · even light · hair tied back off'}
        </Meta>
      </View>

      <View style={[styles.header, { top: insets.top + space.s4 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          style={styles.round}
        >
          <Body tone="paper">✕</Body>
        </Pressable>
        <Meta tone="paper60">Photo for this look</Meta>
        <View style={styles.round} />
      </View>

      <View style={[styles.controls, { bottom: insets.bottom + space.s5 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose from library"
          onPress={fromLibrary}
          style={styles.library}
        >
          <Meta variant="metaSmall" tone="paper50">
            library
          </Meta>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="Take photo" onPress={snap} style={styles.shutterRing}>
          <View style={styles.shutter} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Flip camera"
          onPress={() => setFacing((current) => (current === 'front' ? 'back' : 'front'))}
          style={styles.flip}
        >
          <Body tone="paper">⟳</Body>
        </Pressable>
      </View>
    </View>
  );
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
    justifyContent: 'space-between',
  },
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
  library: {
    width: 52,
    height: 52,
    borderRadius: radius.tile,
    backgroundColor: '#211e1c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 5,
  },
  shutterRing: {
    width: 74,
    height: 74,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    padding: 5,
  },
  shutter: { flex: 1, borderRadius: radius.pill, backgroundColor: color.paper },
  flip: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
