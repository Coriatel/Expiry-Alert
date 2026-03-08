import cron from 'node-cron';
import { config } from '../config.js';
import { listRecords } from './directus.js';
import { ReagentRecord } from './reagents.js';
import { MembershipRecord } from './teams.js';
import { sendNotificationToUser } from './push.js';
import {
  AlertType,
  findExistingLog,
  isDismissedAndNotEligible,
  logNotificationSent,
} from './notificationLog.js';

const tableMemberships = config.directus.collections.memberships as any;
const tableReagents = config.directus.collections.reagents as any;

export function initCron() {
  // Run at 9:00 UTC and 17:00 UTC for timezone coverage
  cron.schedule('0 9,17 * * *', async () => {
    console.log('Running expiry check...');
    try {
      await checkAndNotify();
    } catch (error) {
      console.error('Error in expiry check:', error);
    }
  });

  if (config.nodeEnv === 'development') {
    setTimeout(() => {
      console.log('Running dev startup expiry check...');
      checkAndNotify().catch(console.error);
    }, 5000);
  }
}

function getAlertType(diffDays: number): AlertType | null {
  if (diffDays === 7) return '7day';
  if (diffDays === 2) return '2day';
  if (diffDays === 1) return '1day';
  if (diffDays === 0) return '0day';
  if (diffDays < 0 && diffDays >= -7) return 'expired';
  return null;
}

function buildNotificationPayload(reagent: ReagentRecord, diffDays: number, alertType: AlertType) {
  let body: string;
  if (diffDays > 0) {
    body = `${reagent.name} expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  } else if (diffDays === 0) {
    body = `${reagent.name} expires today!`;
  } else {
    body = `${reagent.name} expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
  }

  return {
    title: 'Expiry Alert',
    body,
    icon: '/icon-192.png',
    badge: '/icon-badge-72.png',
    tag: `expiry-${reagent.id}-${alertType}`,
    data: { url: '/', reagentId: reagent.id, alertType },
  };
}

interface PendingAlert {
  reagent: ReagentRecord;
  diffDays: number;
  alertType: AlertType;
}

async function checkAndNotify() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const reagents = await listRecords<ReagentRecord>(tableReagents, {
    filter: { is_archived: { _eq: false } },
    limit: 5000,
  });

  // Group alerts by team
  const teamAlerts = new Map<number, PendingAlert[]>();

  for (const r of reagents) {
    if (!r.expiry_date) continue;

    const expiry = new Date(r.expiry_date);
    expiry.setUTCHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const alertType = getAlertType(diffDays);
    if (!alertType) continue;

    if (!teamAlerts.has(r.team)) teamAlerts.set(r.team, []);
    teamAlerts.get(r.team)!.push({ reagent: r, diffDays, alertType });
  }

  if (teamAlerts.size === 0) return;

  for (const [teamId, alerts] of teamAlerts.entries()) {
    const memberships = await listRecords<MembershipRecord>(tableMemberships, {
      filter: { team: { _eq: teamId } },
      limit: 1000,
    });

    const userIds = memberships
      .filter((m) => m.email_alerts_enabled !== false)
      .map((m) => m.user);

    if (userIds.length === 0) continue;

    for (const uid of userIds) {
      // If >5 items for this team, group into a summary notification
      if (alerts.length > 5) {
        await sendGroupedNotification(uid, teamId, alerts);
        continue;
      }

      // Send per-item notifications
      for (const alert of alerts) {
        await sendSingleAlert(uid, teamId, alert);
      }
    }
  }
}

async function sendSingleAlert(userId: number, teamId: number, alert: PendingAlert) {
  const { reagent, diffDays, alertType } = alert;

  try {
    // Check if already sent
    const existing = await findExistingLog(reagent.id, userId, alertType);

    if (alertType === '7day') {
      // One-time: if any log exists, skip
      if (existing) return;
    } else {
      // Recurring: if sent today, skip
      if (existing) return;
    }

    // Check if dismissed and not eligible yet
    const dismissed = await isDismissedAndNotEligible(reagent.id, userId, alertType);
    if (dismissed) return;

    const payload = buildNotificationPayload(reagent, diffDays, alertType);
    await sendNotificationToUser(userId, payload);
    await logNotificationSent(reagent.id, userId, teamId, alertType);
  } catch (error) {
    console.error(`Failed to send alert for reagent ${reagent.id} to user ${userId}:`, error);
  }
}

async function sendGroupedNotification(userId: number, teamId: number, alerts: PendingAlert[]) {
  // Filter out already-sent/dismissed alerts
  const eligible: PendingAlert[] = [];

  for (const alert of alerts) {
    const existing = await findExistingLog(alert.reagent.id, userId, alert.alertType);
    if (alert.alertType === '7day' && existing) continue;
    if (alert.alertType !== '7day' && existing) continue;

    const dismissed = await isDismissedAndNotEligible(alert.reagent.id, userId, alert.alertType);
    if (dismissed) continue;

    eligible.push(alert);
  }

  if (eligible.length === 0) return;

  // Send a single grouped notification
  const urgent = eligible.filter((a) => a.diffDays <= 2).length;
  const body = urgent > 0
    ? `${eligible.length} items need attention (${urgent} urgent)`
    : `${eligible.length} items are expiring soon`;

  const payload = {
    title: 'Expiry Alert',
    body,
    icon: '/icon-192.png',
    badge: '/icon-badge-72.png',
    tag: `expiry-group-${teamId}`,
    data: { url: '/' },
  };

  try {
    await sendNotificationToUser(userId, payload);
    // Log all individual items
    for (const alert of eligible) {
      await logNotificationSent(alert.reagent.id, userId, teamId, alert.alertType);
    }
  } catch (error) {
    console.error(`Failed to send grouped alert to user ${userId}:`, error);
  }
}
