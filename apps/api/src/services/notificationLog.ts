import { config } from '../config.js';
import { createRecord, listRecords, updateSingleRecord } from './directus.js';

export type AlertType = '7day' | '2day' | '1day' | '0day' | 'expired';

export interface NotificationLogRecord {
  id: number;
  reagent: number;
  user: number;
  team: number;
  alert_type: AlertType;
  sent_at: string;
  dismissed_at: string | null;
  next_eligible_at: string | null;
}

const collection = config.directus.collections.notificationLog as any;

/**
 * Check if a notification of this type was already sent for this reagent+user combo.
 * For 7day: returns the record if it exists at all (one-time).
 * For recurring (2day/1day/0day/expired): returns the record if sent today.
 */
export async function findExistingLog(
  reagentId: number,
  userId: number,
  alertType: AlertType,
): Promise<NotificationLogRecord | null> {
  const filter: any = {
    _and: [
      { reagent: { _eq: reagentId } },
      { user: { _eq: userId } },
      { alert_type: { _eq: alertType } },
    ],
  };

  if (alertType === '7day') {
    // For 7day: any record means already handled
    const records = await listRecords<NotificationLogRecord>(collection, {
      filter,
      limit: 1,
    });
    return records[0] ?? null;
  }

  // For recurring alerts: check if sent today
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  filter._and.push({ sent_at: { _gte: todayStart.toISOString() } });

  const records = await listRecords<NotificationLogRecord>(collection, {
    filter,
    limit: 1,
  });
  return records[0] ?? null;
}

/**
 * Check if this alert was dismissed and is not yet eligible for resend.
 */
export async function isDismissedAndNotEligible(
  reagentId: number,
  userId: number,
  alertType: AlertType,
): Promise<boolean> {
  const now = new Date().toISOString();

  // Find a dismissed log where next_eligible_at is null (permanent) or in the future
  const records = await listRecords<NotificationLogRecord>(collection, {
    filter: {
      _and: [
        { reagent: { _eq: reagentId } },
        { user: { _eq: userId } },
        { alert_type: { _eq: alertType } },
        { dismissed_at: { _nnull: true } },
        {
          _or: [
            { next_eligible_at: { _null: true } }, // permanent dismiss
            { next_eligible_at: { _gt: now } },     // not yet eligible
          ],
        },
      ],
    },
    limit: 1,
  });

  return records.length > 0;
}

/**
 * Record that a notification was sent.
 */
export async function logNotificationSent(
  reagentId: number,
  userId: number,
  teamId: number,
  alertType: AlertType,
): Promise<void> {
  await createRecord(collection, {
    reagent: reagentId,
    user: userId,
    team: teamId,
    alert_type: alertType,
    sent_at: new Date().toISOString(),
  });
}

/**
 * Dismiss a notification.
 * 7day: permanent (next_eligible_at = null).
 * Recurring: 24-hour (next_eligible_at = tomorrow 00:00 UTC).
 */
export async function dismissNotificationLog(
  reagentId: number,
  userId: number,
  alertType: AlertType,
): Promise<void> {
  // Find the most recent log entry for this combo
  const records = await listRecords<NotificationLogRecord>(collection, {
    filter: {
      _and: [
        { reagent: { _eq: reagentId } },
        { user: { _eq: userId } },
        { alert_type: { _eq: alertType } },
      ],
    },
    sort: ['-sent_at'],
    limit: 1,
  });

  if (records.length === 0) {
    // No log to dismiss — create a pre-emptive dismiss record
    const nextEligible = alertType === '7day' ? null : tomorrowMidnightUTC();
    await createRecord(collection, {
      reagent: reagentId,
      user: userId,
      team: 0, // will be overridden by caller if needed
      alert_type: alertType,
      sent_at: new Date().toISOString(),
      dismissed_at: new Date().toISOString(),
      next_eligible_at: nextEligible,
    });
    return;
  }

  const nextEligible = alertType === '7day' ? null : tomorrowMidnightUTC();
  await updateSingleRecord(collection, records[0].id, {
    dismissed_at: new Date().toISOString(),
    next_eligible_at: nextEligible,
  });
}

function tomorrowMidnightUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}
