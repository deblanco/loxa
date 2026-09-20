/**
 * The cache key for a render: a hash of the three things that decide the image.
 *
 * Hashed rather than concatenated because the photo is megabytes and a KV key
 * is 512 bytes, and because a key containing the user's photograph would put
 * their face in a log line. The device id is *not* in it — two people who
 * upload the same photo and pick the same look would get the same picture, and
 * that is fine; nobody can produce a hit without already holding the photo.
 */
export async function renderCacheKey(
  imageBase64: string,
  styleId: string,
  colorId: string,
): Promise<string> {
  // The material is pinned by a test with a literal in it. This is a live
  // cache: changing what goes into the digest silently cold-starts every
  // render in production, which reads as the model having got slower.
  return `tryon:${await sha256Hex(`${styleId} ${colorId} ${imageBase64}`)}`;
}

/**
 * The cache key for an analysis: the photographs, and the catalogue they were
 * read against.
 *
 * The catalogue fingerprint is in the material because an answer is a list of
 * cuts, and the day a twenty-fifth cut ships, every cached answer is an answer
 * that could not have named it. Without this the new cut would be withheld from
 * everyone holding a cached result until it expired.
 *
 * Order-sensitive, deliberately: the app sends the photos in the order they
 * were taken, and sorting them would win hits for an arrangement nobody asked
 * for. Like the render key it carries no device id — nobody can produce a hit
 * without already holding the photographs.
 */
export async function analysisCacheKey(
  photosBase64: readonly string[],
  catalogueIds: readonly string[],
): Promise<string> {
  const material = `v1 ${catalogueIds.join(',')} ${photosBase64.join('\n')}`;
  return `analysis:${await sha256Hex(material)}`;
}

async function sha256Hex(material: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
