/**
 * Taking the photograph out of an error report.
 *
 * `POST /v1/tryon` carries `imageBase64`, so any error that captures a request
 * body captures a user's face. The privacy policy says the photo we are sent is
 * not stored on our server, and an error report is the way to break that by
 * accident.
 *
 * **It lives here, in the shared package, because it runs on both sides.** The
 * app scrubs before sending, so a photo never crosses the wire; the Worker
 * scrubs again before writing, so the guarantee does not depend on the client
 * being ours or being current. Two copies of this regex would be two chances
 * for one of them to drift, on the one rule where drift is a privacy incident.
 */

/**
 * A run of base64 long enough that it cannot be anything but data.
 *
 * Two hundred characters is about 150 bytes. A checksum, an id or a token
 * fragment does not reach it; a photograph passes it within the first line. The
 * threshold sits far above anything legitimate rather than tuned close to it —
 * a scrubber that eats real error text is one that hides what it was added to
 * show.
 */
const BASE64_RUN = /[A-Za-z0-9+/]{200,}={0,2}/g;

export function redactImageData(text: string): string {
  return text.replace(BASE64_RUN, '[redacted]');
}
