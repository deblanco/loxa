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
  const material = `${styleId} ${colorId} ${imageBase64}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));

  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return `tryon:${hex}`;
}
