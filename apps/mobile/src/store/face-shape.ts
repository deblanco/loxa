import AsyncStorage from '@react-native-async-storage/async-storage';
import { faceShapeSchema, type FaceShape } from '@loxa/shared';
import { FaceTracker } from 'face-track';
import { faceShape } from '@/face/shape';

/**
 * The user's face shape, as last measured, on this phone only.
 *
 * Written from `photo.ts` whenever a photo with exactly one face comes in, so
 * it follows the most recent photo the user took of themselves. It is never
 * sent anywhere: not with a render, not in a diagnostic report, not in the
 * style tally. The profile shows it and can clear it.
 *
 * The shape is stored, never the measurements or the photo they came from.
 */
const KEY = 'loxa.faceShape.v1';

/** The stored shape, or null if there is none or it is not one this build knows. */
export async function readFaceShape(): Promise<FaceShape | null> {
  try {
    const parsed = faceShapeSchema.safeParse(await AsyncStorage.getItem(KEY));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Measure a photo and remember its shape.
 *
 * Fails quiet, like the face check it follows: a shape that could not be
 * measured leaves the last one in place and costs the user nothing but a
 * suggestion. A photo that is measured but ambiguous — a turned head — also
 * leaves the last one in place, rather than erasing a good answer with no
 * answer.
 */
export async function measureFaceShape(uri: string): Promise<void> {
  try {
    const measure = await FaceTracker.measureImage(uri);
    const shape = measure ? faceShape(measure) : null;
    if (shape) await AsyncStorage.setItem(KEY, shape);
  } catch {
    // Vision refused, or the module is absent on this build. No suggestion.
    //
    // A simulator always lands here: `VNDetectFaceLandmarksRequest` throws
    // "Could not create inference context" there, the same way `checkFace`
    // does. The strip then shows its ordinary order, which is why nothing
    // above this line treats a missing shape as a failure.
  }
}

/** Forget it. The next photo with a face will measure it again. */
export async function clearFaceShape(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
