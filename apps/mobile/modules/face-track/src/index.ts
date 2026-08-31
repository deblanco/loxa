import { NitroModules } from 'react-native-nitro-modules'
import type { FaceTrack } from './FaceTrack.nitro'

export type { FaceTrack, DetectedFace, FacePoint } from './FaceTrack.nitro'

/**
 * The detector, created once.
 *
 * A HybridObject per frame would allocate thirty times a second for something
 * that holds no state between calls.
 */
export const FaceTracker = NitroModules.createHybridObject<FaceTrack>('FaceTrack')
