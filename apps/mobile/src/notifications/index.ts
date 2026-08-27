import * as Notifications from 'expo-notifications';
import { copyForDay } from './copy';
import { scheduleFrom } from './schedule';

/**
 * The platform half of the daily notification.
 *
 * Everything decidable — what it says, when it fires — is in `copy.ts` and
 * `schedule.ts` and is tested. This file only talks to iOS, and is verified on
 * a device.
 */

export async function enableDaily(now = new Date()): Promise<boolean> {
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;

  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const { dayIndex, fireAt } of scheduleFrom(now)) {
    const { title, body } = copyForDay(dayIndex);
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
  }

  return true;
}

export async function disableDaily(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
