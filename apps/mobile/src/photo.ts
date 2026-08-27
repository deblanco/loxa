import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/**
 * Getting a photo ready to send.
 *
 * Downscaled to 1024px on the long edge and re-encoded as JPEG at 0.8 before it
 * leaves the phone. A modern iPhone photo is 4-6MB, and the model neither needs
 * nor rewards the extra pixels — sending them costs the user their upload and
 * costs us nothing but latency.
 */
const MAX_EDGE = 1024;
const QUALITY = 0.8;

export interface PreparedPhoto {
  /** Base64 JPEG, no data: prefix — the Worker's schema rejects one. */
  base64: string;
  /** A local URI, for showing the photo before it has been sent. */
  uri: string;
}

export async function prepare(uri: string): Promise<PreparedPhoto> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_EDGE } }],
    { compress: QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  if (!result.base64) throw new Error('could not read the photo');
  return { base64: result.base64, uri: result.uri };
}

/**
 * Pick from the library.
 *
 * Returns null when the user backs out or declines access, which is not an
 * error — it is them saying no, and the screen should simply stay where it is.
 */
export async function pickFromLibrary(): Promise<PreparedPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    // Matches the generated image, so what is cropped here is what comes back.
    aspect: [2, 3],
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) return null;
  return await prepare(result.assets[0].uri);
}
