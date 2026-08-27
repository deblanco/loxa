import { Directory, File, Paths } from 'expo-file-system';
import {
  lookImageName,
  lookMetaName,
  newLookRecord,
  newestFirst,
  parseLookRecord,
  type Look,
  type StoredLook,
} from './look-record';

/**
 * Generated looks, on the device.
 *
 * The images live in the app's own document directory rather than on a server:
 * they are photographs of the user's face, we have no reason to keep them, and
 * the Worker's render cache expires on its own.
 *
 * Each look is two files — `${id}.jpg` and `${id}.json` — rather than an index
 * plus a folder of images. An index is a second thing to keep in step, and a
 * half-written one loses every look at once; a stray pair loses one.
 *
 * The image is written as `.jpg` because the Worker's port guarantees JPEG: the
 * Vertex adapter throws rather than hand back a PNG, for exactly this reason.
 *
 * **The directory is resolved on every call, never cached and never persisted.**
 * `Paths.document` contains the app container UUID, which is reassigned on
 * reinstall and can change on a restore or a device migration. Holding it in a
 * module constant would survive an app update fine and then break silently the
 * first time a user restores a backup. See `look-record.ts`.
 */
function looksDir(): Directory {
  const dir = new Directory(Paths.document, 'looks');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export type { Look, StoredLook };

/** Where a look's image lives *right now*. Cheap; call it, don't store it. */
export function lookUri(id: string): string {
  return new File(looksDir(), lookImageName(id)).uri;
}

export async function saveLook(input: {
  imageBase64: string;
  styleId: string;
  colorId: string;
}): Promise<Look> {
  const dir = looksDir();
  const id = crypto.randomUUID();

  const image = new File(dir, lookImageName(id));
  image.write(input.imageBase64, { encoding: 'base64' });

  const record = newLookRecord({
    id,
    styleId: input.styleId,
    colorId: input.colorId,
    createdAt: new Date().toISOString(),
  });

  new File(dir, lookMetaName(id)).write(JSON.stringify(record));

  return { ...record, uri: image.uri };
}

export async function readLook(id: string): Promise<Look | null> {
  const dir = looksDir();

  const meta = new File(dir, lookMetaName(id));
  if (!meta.exists) return null;

  const record = parseLookRecord(await meta.text());
  if (!record) return null;

  const image = new File(dir, lookImageName(record.id));
  // The record outliving its image is the shape a half-finished write leaves
  // behind. A missing picture is not a look.
  if (!image.exists) return null;

  return { ...record, uri: image.uri };
}

/** Newest first, which is the order the profile's gallery will want them in. */
export async function listLooks(): Promise<Look[]> {
  const dir = looksDir();

  const ids = dir
    .list()
    .filter((entry): entry is File => entry instanceof File && entry.name.endsWith('.json'))
    .map((entry) => entry.name.replace(/\.json$/, ''));

  const looks = await Promise.all(ids.map((id) => readLook(id)));
  const found = looks.filter((look): look is Look => look !== null);

  return newestFirst(found).map((record) => ({ ...record, uri: lookUri(record.id) }));
}
