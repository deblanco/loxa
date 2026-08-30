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

  const photo = { base64: result.base64, uri: result.uri };

  // **A detector that fails is not a verdict.** `checkFace` rejects with
  // `ERR_FACE_DETECTION` when Vision will not run the request at all, which is
  // a property of the machine rather than of the photograph — the simulator is
  // where it shows up. Left to throw it reaches the screen as an unhandled
  // rejection and a shutter that does nothing.
  //
  // So it fails open. The check is an optimisation: it saves a round trip and a
  // credit on a photo the model was going to refuse anyway. Failing closed
  // would trade that saving for an app in which no photo can be chosen at all,
  // which is the worse of the two by a distance.
  const face = await checkFace(result.uri, { minPixelSize: MIN_PIXELS }).catch(() => null);
  if (!face) return { ok: true, photo };

  if (face.status !== 'READY') return { ok: false, reason: VERDICTS[face.status] };

  return { ok: true, photo };
}

/**
 * Pick from the library.
 *
 * **No permission is asked for, because none is required.** The picker runs
 * out of process — iOS hands back the one image that was chosen and the app
 * never sees the library — so `launchImageLibraryAsync` has no permission gate
 * of its own, unlike `launchCameraAsync` beside it. Asking anyway put a full
 * library-access prompt in front of the user, and a "Don't Allow" then closed
 * the picker permanently: every route into it — the plate, the camera's library
 * button, the profile portrait — went dead for a sheet that would have opened.
 *
 * Returns null when the user backs out, which is not an error — it is them
 * saying no, and the screen should simply stay where it is.
 */
export async function pickFromLibrary(): Promise<PhotoResult | null> {
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
