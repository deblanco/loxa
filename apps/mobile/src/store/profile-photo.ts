import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * The user's own portrait, as their profile picture.
 *
 * It is not the photo a render is made from — that one travels through the
 * router, is used once, and is never written down. This is the picture the app
 * wears: the header avatar and the identity block on the profile. Until there
 * is one, both of those are an invitation rather than a face.
 *
 * **The id is persisted, never the path.** `Paths.document` contains the app
 * container UUID, which is reassigned on reinstall and can change on a restore
 * or a device migration — see `look-record.ts`, which is the same rule for the
 * same reason. The id is stored, and the file is found from wherever the
 * documents directory happens to be right now.
 *
 * The id is also what makes replacing the photo visible. `expo-image` caches on
 * the URI, so writing a new portrait over a fixed filename would leave the old
 * face on screen until the cache decided otherwise. A fresh id per photo is a
 * fresh URI, and the previous file is deleted in the same breath.
 */
const KEY = 'loxa.profilePhoto.v1';

/** Resolved on every call, never cached and never persisted. */
function photosDir(): Directory {
  const dir = new Directory(Paths.document, 'profile');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function fileFor(id: string): File {
  return new File(photosDir(), `${id}.jpg`);
}

/**
 * Where the portrait is right now, or null if there isn't one.
 *
 * An id whose file has gone — a half-finished write, a container that moved
 * before this rule existed — clears the key rather than being reported as a
 * photo. A caller that is told there is a picture must get one.
 */
export async function readProfilePhoto(): Promise<string | null> {
  const id = await AsyncStorage.getItem(KEY);
  if (!id) return null;

  const file = fileFor(id);
  if (!file.exists) {
    await AsyncStorage.removeItem(KEY).catch(() => {});
    return null;
  }

  return file.uri;
}

/** Write the portrait, replacing whatever was there. Returns its URI. */
export async function saveProfilePhoto(base64: string): Promise<string> {
  const previous = await AsyncStorage.getItem(KEY);

  const id = randomUUID();
  const file = fileFor(id);
  file.write(base64, { encoding: 'base64' });

  // The key moves before the old file goes, so a failure between the two leaves
  // an orphan on disk rather than a profile pointing at a deleted picture.
  await AsyncStorage.setItem(KEY, id);

  if (previous && previous !== id) {
    try {
      const stale = fileFor(previous);
      if (stale.exists) stale.delete();
    } catch {
      // An old portrait that will not delete costs a few hundred kilobytes.
      // It is not worth failing the new one over.
    }
  }

  return file.uri;
}
