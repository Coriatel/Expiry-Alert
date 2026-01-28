import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays, endOfDay, isAfter, isBefore, parseISO, set, subDays } from 'date-fns';
import { formatDate, getDaysUntilExpiry } from '@expiry-alert/shared';
import i18n from '../i18n';
import database from './database';

const CHANNEL_ID = 'expiry-alerts';
const NOTIFICATIONS_SUPPORTED = Platform.OS !== 'web';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function resolveLocale(): string {
  return i18n.language === 'he' ? 'he-IL' : 'en-US';
}

function getScheduleDate(expiryDate: string, remindDays: number): Date | null {
  const now = new Date();
  const expiry = parseISO(expiryDate);
  const expiryEnd = endOfDay(expiry);

  if (isBefore(expiryEnd, now)) {
    return null;
  }

  const targetBase = subDays(expiry, remindDays);
  const target = set(targetBase, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });

  if (isAfter(target, now)) {
    return target;
  }

  const nextMorning = set(addDays(now, 1), { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
  if (isAfter(nextMorning, expiryEnd)) {
    return null;
  }

  return nextMorning;
}

async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Expiry Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (!NOTIFICATIONS_SUPPORTED) {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

export async function cancelAllExpiryNotifications(): Promise<void> {
  if (!NOTIFICATIONS_SUPPORTED) {
    return;
  }

  const schedules = await database.getNotificationSchedules();
  for (const schedule of schedules) {
    await Notifications.cancelScheduledNotificationAsync(schedule.notification_id);
  }

  await database.clearNotificationSchedules();
}

export async function syncExpiryNotifications(): Promise<void> {
  if (!NOTIFICATIONS_SUPPORTED) {
    return;
  }

  await database.init();
  const settings = await database.getNotificationSettings();

  if (!settings.enabled) {
    await cancelAllExpiryNotifications();
    return;
  }

  const hasPermission = await ensureNotificationPermissions();
  if (!hasPermission) {
    return;
  }

  await ensureNotificationChannel();

  const [reagents, schedules] = await Promise.all([
    database.getActiveReagents(),
    database.getNotificationSchedules(),
  ]);

  const scheduleByReagent = new Map(schedules.map((schedule) => [schedule.reagent_id, schedule]));
  const activeReagentIds = new Set<number>();
  const locale = resolveLocale();

  for (const reagent of reagents) {
    activeReagentIds.add(reagent.id);

    const scheduleDate = getScheduleDate(reagent.expiry_date, settings.remindDays);
    const existing = scheduleByReagent.get(reagent.id);

    if (!scheduleDate) {
      if (existing) {
        await Notifications.cancelScheduledNotificationAsync(existing.notification_id);
        await database.deleteNotificationSchedule(reagent.id);
      }
      continue;
    }

    if (
      existing &&
      existing.expiry_date === reagent.expiry_date &&
      existing.remind_days === settings.remindDays
    ) {
      continue;
    }

    if (existing) {
      await Notifications.cancelScheduledNotificationAsync(existing.notification_id);
    }

    const scheduledFor = scheduleDate.toISOString();
    const daysUntil = Math.max(getDaysUntilExpiry(reagent.expiry_date), 0);
    const title = i18n.t('notifications.reagentExpiringTitle');
    const body = i18n.t('notifications.reagentExpiringBody', {
      name: reagent.name,
      days: daysUntil,
      date: formatDate(reagent.expiry_date, locale),
    });

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          reagentId: reagent.id,
          expiryDate: reagent.expiry_date,
        },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: scheduleDate,
        channelId: CHANNEL_ID,
      },
    });

    await database.upsertNotificationSchedule(
      reagent.id,
      notificationId,
      scheduledFor,
      reagent.expiry_date,
      settings.remindDays
    );
  }

  for (const schedule of schedules) {
    if (!activeReagentIds.has(schedule.reagent_id)) {
      await Notifications.cancelScheduledNotificationAsync(schedule.notification_id);
      await database.deleteNotificationSchedule(schedule.reagent_id);
    }
  }
}
