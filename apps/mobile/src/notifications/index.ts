import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import i18n from '@/i18n';
import { copyForDay } from './copy';
import { needsTopUp, scheduleFrom } from './schedule';

/**
 * The platform half of the daily notification.
 *
 * Everything decidable — which line, when it fires — is in `copy.ts` and
 * `schedule.ts` and is tested. This file only talks to iOS, and is verified on
 * a device.
 *
 * The week is scheduled in whatever language the app is speaking when the
 * toggle is flipped, because iOS holds finished text rather than keys. Changing
 * language therefore re-schedules — see `setLanguage`'s caller in
 * `app/language.tsx`.
 */

/**
 * Whether the person asked for these, kept apart from what iOS happens to be
 * holding. A week of notifications runs out by itself, and an empty queue on its
 * own cannot tell "used them all up" from "never turned it on" — which is what
 * made the toggle go quietly off seven days after it was pressed.
 */
const WANTED = 'loxa.daily.v1';

async function scheduleWeek(now: Date): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const { dayIndex, fireAt } of scheduleFrom(now)) {
    const line = copyForDay(dayIndex);
    await Notifications.scheduleNotificationAsync({
      content: { title: i18n.t(line.title), body: i18n.t(line.body) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
  }
}

export async function enableDaily(now = new Date()): Promise<boolean> {
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;

  await scheduleWeek(now);
  await AsyncStorage.setItem(WANTED, '1').catch(() => {});
  return true;
}

export async function disableDaily(): Promise<void> {
  await AsyncStorage.removeItem(WANTED).catch(() => {});
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Whether the daily notification is actually on.
 *
 * Both halves, because either one alone lies. A queue with the permission
 * revoked in Settings is a week of notifications iOS will never show; a granted
 * permission with nothing queued is the ordinary state after `disableDaily`,
 * and the state of every install that has never touched the toggle.
 *
 * `getPermissionsAsync` reads rather than asks, so this is safe on a screen
 * somebody opened to look at their credit balance — the same reason
 * `rescheduleDaily` reads the queue instead of requesting permission.
 */
export async function isDailyEnabled(): Promise<boolean> {
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return false;
  return await wantsDaily();
}

/**
 * The flag, or a queue that is already there.
 *
 * The queue counts as a yes because every install that turned this on before the
 * flag existed has one and no flag, and they should keep what they asked for.
 */
async function wantsDaily(): Promise<boolean> {
  if ((await AsyncStorage.getItem(WANTED).catch(() => null)) !== null) return true;
  return (await Notifications.getAllScheduledNotificationsAsync()).length > 0;
}

/**
 * Re-schedule the week in the language the app now speaks.
 *
 * iOS holds finished text, not keys, so switching language would otherwise
 * leave a week of German suggestions arriving on a Spanish app. Nothing happens
 * if the toggle was never turned on: this reads what iOS is actually holding
 * rather than asking for permission, so it can never put a prompt in front of
 * somebody who only came to change the language.
 */
export async function rescheduleDaily(now = new Date()): Promise<void> {
  if (!(await wantsDaily())) return;
  await scheduleWeek(now);
}

/**
 * Write another week before the last one runs out.
 *
 * Called on launch and on coming back to the foreground, which is the only time
 * this app runs. Reads rather than asks: permission revoked in Settings, or
 * daily never turned on, is a quiet return — the same rule as `rescheduleDaily`,
 * so this can never put a prompt in front of somebody who did not ask.
 */
export async function topUpDaily(now = new Date()): Promise<void> {
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  if (!(await wantsDaily())) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  if (!needsTopUp(scheduled.length)) return;

  await scheduleWeek(now);
}
