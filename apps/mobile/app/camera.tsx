import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pill } from '@/components/Pill';
import { Body, Meta } from '@/components/Text';
import { pickFromLibrary, prepare } from '@/photo';
import { color, radius, space } from '@/theme';

/**
 * Taking the photo.
 *
 * The oval and the line under it are the whole quality-control story for now:
 * a centred face in even light is most of what makes a render good, and saying
 * so before the shutter is cheaper than a failed generation afterwards.
 *
 * Front camera by default, because the photo is of the person holding the phone.
 */
export default function Camera() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const camera = useRef<CameraView>(null);

  async function snap() {
    const shot = await camera.current?.takePictureAsync({ quality: 1 });
    if (!shot) return;

    const photo = await prepare(shot.uri);
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

  if (!permission?.granted) {
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
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={facing} />
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
