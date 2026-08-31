import AsyncStorage from '@react-native-async-storage/async-storage';
import { readProfilePhoto, saveProfilePhoto } from '@/store/profile-photo';

/**
 * Offering the render's own photograph as the profile portrait.
 *
 * By the time somebody reaches the result screen they have already handed the
 * app a face-checked, downscaled, 9:16 picture of themselves — `photo.ts`
 * guarantees exactly one face is in it. That is a better portrait than most
 * people would take on purpose, and until now it was thrown away. So the result
 * screen asks for it, once, and only while there is no portrait yet.
 *
 * **Held in memory, never written down until the answer is yes.** That is
 * `profile-photo.ts`'s rule kept intact: the photo a render is made from
 * travels through the router and is used once. Writing 700KB to disk for a user
 * who then declines is work that would have to be undone, and threading the
 * base64 through a second `router.replace` would double the largest string the
 * router already carries. A module variable costs nothing and loses at most one
 * ask to a reload, which is the right price.
 *
 * The offer is *armed* on the preview screen, which is the only screen holding
 * both halves of the photo, and *consumed* on the result screen, which is only
 * reachable once a render has actually been billed and saved. A render that
 * fails leaves a holder nothing reads and the next one overwrites.
 */
const KEY = 'loxa.portraitAsk.v1';

export interface OfferedPhoto {
  base64: string;
  /** A local URI, for the card's thumbnail — the base64 is for the write. */
  uri: string;
}

let offered: OfferedPhoto | null = null;

/** Remember the photo a render is about to be made from. */
export function offerPortrait(photo: OfferedPhoto): void {
  offered = photo;
}

/**
 * The photo to offer, or null if there is nothing to ask.
 *
 * Three ways to be null, and the middle one is the reason this reads
 * `readProfilePhoto` rather than trusting the key: somebody who set a portrait
 * from the profile between arming and here must not be asked to set it again.
 *
 * Fails quiet. This runs on the result screen, behind the user's own picture,
 * and a prompt has no business being the reason that screen breaks.
 */
export async function pendingPortrait(): Promise<OfferedPhoto | null> {
  if (!offered) return null;

  try {
    if (await AsyncStorage.getItem(KEY)) return null;
    if (await readProfilePhoto()) return null;
  } catch {
    return null;
  }

  return offered;
}

/** Yes. Writes the portrait, and never asks again. */
export async function acceptPortrait(photo: OfferedPhoto): Promise<void> {
  try {
    await saveProfilePhoto(photo.base64);
  } catch {
    // A portrait that will not write is not worth a broken result screen. The
    // profile's own invitation is still there, so nothing is lost but the
    // shortcut — and the ask is settled below either way rather than returning
    // on the next render to fail again.
  }
  await declinePortrait();
}

/**
 * No, and no next time.
 *
 * Permanent on purpose. The profile screen's "Add your photo" is the way in for
 * anybody who changes their mind, and a prompt that keeps coming back after it
 * has been refused is the kind that gets the app deleted.
 */
export async function declinePortrait(): Promise<void> {
  offered = null;
  await AsyncStorage.setItem(KEY, new Date().toISOString()).catch(() => {});
}

/** Development only: put the ask back within reach. */
export async function clearPortraitOffer(): Promise<void> {
  offered = null;
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
