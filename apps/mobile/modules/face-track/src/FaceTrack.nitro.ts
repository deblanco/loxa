import type { HybridObject, UInt64 } from 'react-native-nitro-modules'

/**
 * A point in camera space, `0..1` across the frame, origin top-left.
 *
 * Apple Vision works bottom-left and normalized to the face's own box; both
 * conversions happen in Swift, so nothing above this file has to know that.
 */
export interface FacePoint {
  x: number
  y: number
}

/**
 * One face, as the viewfinder needs it.
 *
 * Every landmark is optional and absent rather than guessed: `project` in
 * `src/face/geometry.ts` drops a point it was not given, along with any line
 * that would have dangled from it.
 */
export interface DetectedFace {
  /** The face's bounding box in camera space, origin top-left. */
  x: number
  y: number
  width: number
  height: number

  leftEye?: FacePoint
  rightEye?: FacePoint
  noseBase?: FacePoint
  mouthLeft?: FacePoint
  mouthRight?: FacePoint
  mouthBottom?: FacePoint
  leftCheek?: FacePoint
  rightCheek?: FacePoint
}

/**
 * Face landmarks from one camera frame, on the frame's own thread.
 *
 * It takes a raw buffer pointer rather than VisionCamera's `Frame`, which is
 * what `NativeBuffer` is for — "a shared contract between libraries to interact
 * with native buffers without natively typed bindings". On iOS the pointer is a
 * `CVPixelBufferRef` at +1, so this reads the camera's own memory with no copy
 * and no build-time dependency on VisionCamera at all.
 *
 * The caller owns the buffer's lifetime and must `release()` it afterwards.
 */
export interface FaceTrack extends HybridObject<{ ios: 'swift' }> {
  /**
   * The largest face in the frame, or `undefined` if there is none.
   *
   * `orientation` and `mirrored` come off the Frame and decide how Vision is
   * asked to read the buffer; a mirrored selfie read as un-mirrored puts the
   * subject's parting on the wrong side of their head.
   */
  detect(
    buffer: UInt64,
    orientation: string,
    mirrored: boolean,
  ): DetectedFace | undefined
}
