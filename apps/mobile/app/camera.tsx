import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
  type CameraRef,
  type TargetCameraPosition,
} from 'react-native-vision-camera';
import { Camera as FaceCamera, type Face } from 'react-native-vision-camera-face-detector';
import { FaceConstellation } from '@/components/FaceConstellation';
import { Pill } from '@/components/Pill';
import { Body, Meta } from '@/components/Text';
import {
  affineFromCorners,
  project,
  smooth,
  LANDMARK_ORDER,
  type FaceGeometry,
  type Landmarks,
} from '@/face/geometry';
import { pickFromLibrary, prepare } from '@/photo';
import { color, radius, space } from '@/theme';

/**
 * Taking the photo.
 *
 * The oval and the line under it are the whole quality-control story for now:
 * a centred face in even light is most of what makes a render good, and saying
 * so before the shutter is cheaper than a failed generation afterwards.
 *
 * The constellation over it is decoration and nothing more — it gates no
 * shutter, reaches no Worker, and the photo is taken whether or not a face was
 * ever found. What it buys is the moment before the shutter reading as *this
 * app is looking at me*, which is the promise the render then has to keep.
 *
 * Front camera by default, because the photo is of the person holding the phone.
 */

/**
 * How often the overlay is allowed to move.
 *
 * The detector runs as fast as the frames arrive. Re-rendering twenty-odd views
 * at that rate buys nothing an eye can see and costs the JS thread the detector
 * is already sitting on.
 */
const REDRAW_MS = 80;

/** How much of each new frame the dots take. Low is calm; 1 is the raw twitch. */
const SMOOTHING = 0.35;

export default function Camera() {
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [facing, setFacing] = useState<TargetCameraPosition>('front');
  const camera = useRef<CameraRef>(null);

  const device = useCameraDevice(facing);
  const photoOutput = usePhotoOutput({ qualityPrioritization: 'quality' });

  const [geometry, setGeometry] = useState<FaceGeometry | null>(null);
  const previous = useRef<Landmarks | null>(null);
  const drawnAt = useRef(0);

  const onFacesDetected = useCallback((faces: Face[]) => {
    const face = faces[0];
    if (!face) {
      previous.current = null;
      setGeometry(null);
      return;
    }

    const now = Date.now();
    if (now - drawnAt.current < REDRAW_MS) return;
    drawnAt.current = now;

    // `Face` is a Nitro hybrid: every property here is a native call, and the
    // object is not ours to keep. Copy the numbers out before anything else.
    const detected = face.landmarks;
    if (!detected) return;

    const raw: Landmarks = {};
    for (const key of LANDMARK_ORDER) {
      const point = detected[key];
      if (point) raw[key] = { x: point.x, y: point.y };
    }

    const box = face.bounds;
    const bounds = { x: box.x, y: box.y, width: box.width, height: box.height };
    const frameWidth = face.frameWidth;
    const frameHeight = face.frameHeight;
    if (!frameWidth || !frameHeight) return;

    // Frame coordinates are not view coordinates: the preview crops the frame to
    // fill itself and mirrors it on the front camera. Two converted corners are
    // enough to derive the rest, and cost two native calls instead of ten.
    const preview = camera.current;
    if (!preview) return;

    let topLeft: { x: number; y: number };
    let bottomRight: { x: number; y: number };
    try {
      topLeft = preview.convertCameraPointToViewPoint({
        x: bounds.x / frameWidth,
        y: bounds.y / frameHeight,
      });
      bottomRight = preview.convertCameraPointToViewPoint({
        x: (bounds.x + bounds.width) / frameWidth,
        y: (bounds.y + bounds.height) / frameHeight,
      });
    } catch {
      // The preview has faces before it has geometry. Skip the frame.
      return;
    }

    const eased = smooth(previous.current, raw, SMOOTHING);
    previous.current = eased;
    setGeometry(project(eased, bounds, affineFromCorners(topLeft, bottomRight, bounds)));
  }, []);

  const onError = useCallback(() => {
    // A detector that falls over takes its decoration with it and nothing else.
    // The camera and the shutter are untouched.
    previous.current = null;
    setGeometry(null);
  }, []);

  async function snap() {
    const shot = await photoOutput.capturePhotoToFile({ enableShutterSound: true }, {});

    // `filePath` is a filesystem path, not a URL, and the manipulator wants one.
    const photo = await prepare(`file://${shot.filePath}`, { unmirror: facing === 'front' });
    router.replace({
      pathname: '/preview',
      params: { photoUri: photo.uri, photoBase64: photo.base64 },
    });
  }

  async function fromLibrary() {
    const photo = await pickFromLibrary();
    if (!photo) return;
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
      <View style={[styles.viewfinder, { top: insets.top + space.s3 }]}>
        {device ? (
          <FaceCamera
            ref={camera}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive
            resizeMode="cover"
            mirrorMode="auto"
            outputs={[photoOutput]}
            runLandmarks
            performanceMode="fast"
            minFaceSize={0.15}
            cameraFacing={facing}
            // The scaling `autoMode` does assumes the preview fills the window.
            // This one is a rounded box two thirds of the way up it.
            autoMode={false}
            onFacesDetected={onFacesDetected}
            onError={onError}
          />
        ) : null}
        <FaceConstellation geometry={geometry} />
        <View style={styles.guide} pointerEvents="none" />
        <Meta variant="note" tone="paper60" sentence style={styles.hint}>
          centre your face · even light · hair tied back off
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
