import { checkFace, type FaceCheckStatus } from 'expo-face-check';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import type { FaceVerdict } from '@/face/verdict';

/**
 * Getting a photo ready to send.
 *
 * Downscaled to 1024px on the long edge and re-encoded as JPEG at 0.8 before it
 * leaves the phone. A modern iPhone photo is 4-6MB, and the model neither needs
 * nor rewards the extra pixels — sending them costs the user their upload and
 * costs us nothing but latency.
 *
 * Then, and only then, it is checked for a face. Every photo in the app arrives
 * through here — the shutter and all three picker buttons — so this is the one
 * place the check has to exist. A photo with nobody in it cannot be restyled:
 * the model refuses it, and the refusal costs the user a round trip and us a
 * spent credit to refund. Apple's Vision framework answers the same question on
 * the device, before either happens.
 */
const MAX_EDGE = 1024;
const QUALITY = 0.8;

export interface PreparedPhoto {
  /** Base64 JPEG, no data: prefix — the Worker's schema rejects one. */
  base64: string;
  /** A local URI, for showing the photo before it has been sent. */
  uri: string;
}

/**
 * A photo, or the reason it was turned away.
 *
 * A union rather than a throw, because a faceless photo is not an error — it is
 * the answer to a question the screen asked, and every caller has somewhere to
 * put it.
 */
export type PhotoResult = { ok: true; photo: PreparedPhoto } | { ok: false; reason: FaceVerdict };

/**
 * How small an image may be before it is called low quality rather than
 * face-free. `prepare` resizes to 1024 on the long edge, so anything that
 * arrives here is well over this unless it was a letterbox to begin with.
 */
const MIN_PIXELS = 300_000;

const VERDICTS: Record<Exclude<FaceCheckStatus, 'READY'>, FaceVerdict> = {
  NO_FACE: 'no-face',
  MULTIPLE_FACES: 'multiple-faces',
  LOW_QUALITY: 'low-quality',
};

export interface PrepareOptions {
  /**
   * Flip the photo back.
   *
   * The front camera's preview is mirrored, because a selfie preview that is
   * not reads as a stranger. The capture inherits that mirroring, and a mirrored
   * photo moves the user's parting to the other side of their head before the
   * model ever sees it. This puts it back.
   */
  unmirror?: boolean;
}

export async function prepare(uri: string, options: PrepareOptions = {}): Promise<PhotoResult> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      ...(options.unmirror ? [{ flip: ImageManipulator.FlipType.Horizontal }] : []),
      { resize: { width: MAX_EDGE } },
    ],
    { compress: QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  if (!result.base64) throw new Error('could not read the photo');

  const face = await checkFace(result.uri, { minPixelSize: MIN_PIXELS });
  if (face.status !== 'READY') return { ok: false, reason: VERDICTS[face.status] };

  return { ok: true, photo: { base64: result.base64, uri: result.uri } };
}

/**
 * Pick from the library.
 *
 * Returns null when the user backs out or declines access, which is not an
 * error — it is them saying no, and the screen should simply stay where it is.
 */
export async function pickFromLibrary(): Promise<PhotoResult | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    // Matches the generated image, so what is cropped here is what comes back.
    aspect: [9, 16],
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) return null;
  return await prepare(result.assets[0].uri);
}
