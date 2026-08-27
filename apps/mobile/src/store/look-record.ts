/**
 * What a saved look looks like on disk, and what it must never contain.
 *
 * **No absolute path is ever persisted.** On iOS the documents directory sits
 * under `/var/mobile/Containers/Data/Application/<UUID>/`, and that UUID is not
 * stable: it is reassigned on reinstall and can change when a device is
 * restored from a backup or migrated to a new phone. A URI written into a file
 * today can therefore point at a directory that no longer exists tomorrow,
 * while the image itself is sitting safely where it always was.
 *
 * That failure is quiet and total — the file is fine, the record is fine, and
 * every screen shows a blank plate. So the record holds the id, and the path is
 * rebuilt from wherever the documents directory happens to be right now.
 */

/** The persisted shape. Deliberately without a `uri` field. */
export interface StoredLook {
  id: string;
  styleId: string;
  colorId: string;
  createdAt: string;
}

/** A look with its location resolved against the current container. */
export interface Look extends StoredLook {
  uri: string;
}

export function lookImageName(id: string): string {
  return `${id}.jpg`;
}

export function lookMetaName(id: string): string {
  return `${id}.json`;
}

export function newLookRecord(input: {
  id: string;
  styleId: string;
  colorId: string;
  createdAt: string;
}): StoredLook {
  // Built field by field rather than spread, so a caller handing this an object
  // that happens to carry a `uri` cannot smuggle one onto disk.
  return {
    id: input.id,
    styleId: input.styleId,
    colorId: input.colorId,
    createdAt: input.createdAt,
  };
}

/**
 * Read a record back, tolerating anything that is not one.
 *
 * Returns null rather than throwing: a half-written or hand-edited file should
 * cost its own look and nothing else. Records written by an older build carry a
 * `uri` — it is dropped here rather than migrated, because the value was stale
 * the moment the container moved and the correct one is derivable anyway.
 */
export function parseLookRecord(raw: string): StoredLook | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const record = parsed as Record<string, unknown>;

  const { id, styleId, colorId, createdAt } = record;
  if (
    typeof id !== 'string' ||
    typeof styleId !== 'string' ||
    typeof colorId !== 'string' ||
    typeof createdAt !== 'string'
  ) {
    return null;
  }

  return { id, styleId, colorId, createdAt };
}

/** Newest first — the order the profile's gallery will want them in. */
export function newestFirst(looks: readonly StoredLook[]): StoredLook[] {
  return [...looks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
