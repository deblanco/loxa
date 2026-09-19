import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import {
  lookImageName,
  lookMetaName,
  lookSourceName,
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

export async function saveLook(input: {
  imageBase64: string;
  /** The photograph the render was made from, kept for comparing later. */
  sourceBase64?: string;
  styleId: string;
  colorId: string;
  styleName?: string;
  colorName?: string;
}): Promise<Look> {
  const dir = looksDir();
  const id = randomUUID();

  const image = new File(dir, lookImageName(id));
  image.write(input.imageBase64, { encoding: 'base64' });

  const record = newLookRecord({
    id,
    styleId: input.styleId,
    colorId: input.colorId,
    styleName: input.styleName,
    colorName: input.colorName,
    createdAt: new Date().toISOString(),
  });

  // Before the record: the record is what makes a look exist, so a write that
  // fails half way leaves an orphaned original that `deleteLook` never sees,
  // rather than a look whose comparison is missing. Optional, and a failure
  // costs the comparison and nothing else.
  let sourceUri: string | undefined;
  if (input.sourceBase64) {
    try {
      const source = new File(dir, lookSourceName(id));
      source.write(input.sourceBase64, { encoding: 'base64' });
      sourceUri = source.uri;
    } catch {
      sourceUri = undefined;
    }
  }

  new File(dir, lookMetaName(id)).write(JSON.stringify(record));

  return { ...record, uri: image.uri, ...(sourceUri ? { sourceUri } : {}) };
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

  const source = new File(dir, lookSourceName(record.id));
  return { ...record, uri: image.uri, ...(source.exists ? { sourceUri: source.uri } : {}) };
}

/** Newest first, which is the order the gallery shows them in. */
export async function listLooks(): Promise<Look[]> {
  const dir = looksDir();

  const ids = dir
    .list()
    .filter((entry): entry is File => entry instanceof File && entry.name.endsWith('.json'))
    .map((entry) => entry.name.replace(/\.json$/, ''));

  const looks = await Promise.all(ids.map((id) => readLook(id)));
  const found = looks.filter((look): look is Look => look !== null);

  return newestFirst(found);
}

/**
 * Forget a look: the render, its record and the original it was made from.
 *
 * The record goes first, because the record is what makes a look exist — if
 * a later delete fails, what is left behind is an orphaned image nothing lists,
 * never a look in the gallery whose picture has gone.
 */
export async function deleteLook(id: string): Promise<void> {
  const dir = looksDir();
  for (const name of [lookMetaName(id), lookImageName(id), lookSourceName(id)]) {
    const file = new File(dir, name);
    if (file.exists) file.delete();
  }
}
