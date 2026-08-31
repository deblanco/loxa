import CoreVideo
import Foundation
import NitroModules
import Vision

/**
 * Face landmarks from one camera frame, via Apple Vision.
 *
 * Vision is a system framework, which is the whole reason this exists rather
 * than a third-party detector: it ships a full arm64 simulator slice, and the
 * MLKit binary that used to do this job did not — see the note at the top of
 * `src/face/geometry.ts`.
 *
 * Everything here is a coordinate conversion. Vision reports landmarks
 * bottom-left and normalized to the face's own bounding box; the app draws
 * top-left and normalized to the frame. Doing that here keeps `geometry.ts`
 * import-free and testable in Node, which is what holds it to the coverage gate.
 */
final class HybridFaceTrack: HybridFaceTrackSpec {
  private let sequence = VNSequenceRequestHandler()

  func detect(
    buffer: UInt64,
    orientation: String,
    mirrored: Bool
  ) throws -> DetectedFace? {
    // The pointer is a CVPixelBufferRef at +1, held by the caller for the whole
    // of this call. Unmanaged rather than a bridge cast: this borrows the
    // buffer, and releasing it is the caller's job.
    let pixelBuffer = Unmanaged<CVPixelBuffer>
      .fromOpaque(UnsafeRawPointer(bitPattern: UInt(buffer))!)
      .takeUnretainedValue()

    let request = VNDetectFaceLandmarksRequest()

    // A sequence handler rather than a fresh VNImageRequestHandler per frame:
    // Vision then tracks the same face across frames instead of re-finding one
    // from scratch, which is both faster and steadier.
    try sequence.perform(
      [request],
      on: pixelBuffer,
      orientation: Self.cgOrientation(orientation, mirrored: mirrored)
    )

    guard
      let faces = request.results,
      // The largest face, by area. A face in the background is not the one
      // being photographed, and switching between them mid-frame reads as a
      // fault. `photo.ts` is what turns a two-face photo away, after the
      // shutter; this only has to pick one to draw.
      let face = faces.max(by: { $0.boundingBox.height < $1.boundingBox.height })
    else {
      return nil
    }

    let box = face.boundingBox
    let landmarks = face.landmarks

    /// A region's centre, in frame space.
    func centre(_ region: VNFaceLandmarkRegion2D?) -> FacePoint? {
      guard let points = region?.normalizedPoints, !points.isEmpty else { return nil }
      let sum = points.reduce(CGPoint.zero) {
        CGPoint(x: $0.x + $1.x, y: $0.y + $1.y)
      }
      return Self.toFrame(
        CGPoint(x: sum.x / CGFloat(points.count), y: sum.y / CGFloat(points.count)),
        in: box
      )
    }

    /// The point of a region furthest along one axis, in frame space.
    func extreme(
      _ region: VNFaceLandmarkRegion2D?,
      by pick: (CGPoint, CGPoint) -> Bool
    ) -> FacePoint? {
      guard let point = region?.normalizedPoints.max(by: pick) else { return nil }
      return Self.toFrame(point, in: box)
    }

    // Vision has no cheek region. The face contour runs from one temple down
    // around the jaw to the other, so its widest points are the cheeks.
    //
    // Its two ends are *not* ears — they are the top of the jawline, which is
    // why the ears the first version drew sat on the sides of the head rather
    // than on anything. Vision cannot see ears, so the constellation no longer
    // claims to.
    let contour = landmarks?.faceContour?.normalizedPoints.map { Self.toFrame($0, in: box) }
    let widest = contour.flatMap { points -> (left: FacePoint, right: FacePoint)? in
      guard
        let leftmost = points.min(by: { $0.x < $1.x }),
        let rightmost = points.max(by: { $0.x < $1.x })
      else { return nil }
      return (left: leftmost, right: rightmost)
    }

    // The struct nitrogen generates is immutable, so everything is decided
    // before it is built rather than assigned onto it afterwards.
    return DetectedFace(
      x: box.origin.x,
      // Vision's origin is bottom-left, the viewfinder's is top-left.
      y: 1 - box.origin.y - box.size.height,
      width: box.size.width,
      height: box.size.height,
      leftEye: centre(landmarks?.leftEye),
      rightEye: centre(landmarks?.rightEye),
      // The base of the nose, not its bridge: the lowest point Vision reports
      // for the region, which is where the constellation's lines converge.
      noseBase: extreme(landmarks?.nose, by: { $0.y > $1.y }),
      mouthLeft: extreme(landmarks?.outerLips, by: { $0.x < $1.x }),
      mouthRight: extreme(landmarks?.outerLips, by: { $0.x > $1.x }),
      mouthBottom: extreme(landmarks?.outerLips, by: { $0.y > $1.y }),
      // The subject's left is the frame's right.
      leftCheek: widest?.right,
      rightCheek: widest?.left
    )
  }

  /// A landmark, from the face box's own space into the frame's, top-left.
  private static func toFrame(_ point: CGPoint, in box: CGRect) -> FacePoint {
    let x = box.origin.x + point.x * box.size.width
    let y = box.origin.y + point.y * box.size.height
    return FacePoint(x: x, y: 1 - y)
  }

  /**
   * How Vision should read the buffer.
   *
   * The orientation is the Frame's own, and mirroring matters: the front
   * camera's buffer is mirrored, and reading it as though it were not puts the
   * subject's parting on the wrong side of their head.
   */
  private static func cgOrientation(
    _ orientation: String,
    mirrored: Bool
  ) -> CGImagePropertyOrientation {
    switch (orientation, mirrored) {
    case ("up", false): return .up
    case ("up", true): return .upMirrored
    case ("right", false): return .right
    case ("right", true): return .rightMirrored
    case ("down", false): return .down
    case ("down", true): return .downMirrored
    case ("left", false): return .left
    case ("left", true): return .leftMirrored
    default: return mirrored ? .upMirrored : .up
    }
  }
}
