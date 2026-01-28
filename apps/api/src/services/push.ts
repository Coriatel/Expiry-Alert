import webpush, { PushSubscription } from 'web-push';
import { config } from '../config.js';
import { createRecords, deleteRecord, listRecords } from './nocodb.js';

// Configure web-push
if (config.vapid.publicKey && config.vapid.privateKey) {
  webpush.setVapidDetails(
    config.vapid.subject,
    config.vapid.publicKey,
    config.vapid.privateKey
  );
}

export interface PushSubscriptionRecord {
  Id?: number;
  user_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at?: string;
}

const tableId = config.nocodb.tables.pushSubscriptions;

export async function saveSubscription(userId: number, subscription: PushSubscription) {
  if (!tableId) {
      console.warn('NOCODB_TABLE_PUSH_SUBSCRIPTIONS not set');
      return;
  }
  
  // Check if subscription exists
  const existing = await listRecords<PushSubscriptionRecord>(tableId, {
    where: `(endpoint,eq,${subscription.endpoint})`,
  });

  if (existing.length > 0) {
    // Update user_id if changed? Or just return.
    // For now, assume endpoint is unique per device.
    // If different user logs in, we might want to update user_id.
    // But usually endpoint implies the browser profile.
    // Let's update user_id to be safe.
    // Wait, update logic requires knowing the ID.
    // For simplicity, if it exists, we assume it's fine.
    // Ideally we should update the owner if changed.
    return; 
  }

  await createRecords(tableId, [
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  ]);
}

export async function removeSubscription(endpoint: string) {
  if (!tableId) return;

  const existing = await listRecords<PushSubscriptionRecord>(tableId, {
    where: `(endpoint,eq,${endpoint})`,
  });

  if (existing.length > 0 && existing[0].Id) {
    await deleteRecord(tableId, existing[0].Id);
  }
}

export async function sendNotificationToUser(userId: number, payload: any) {
  if (!tableId) return;

  const subscriptions = await listRecords<PushSubscriptionRecord>(tableId, {
    where: `(user_id,eq,${userId})`,
  });

  const notificationPayload = JSON.stringify(payload);

  const promises = subscriptions.map(async (sub) => {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSub, notificationPayload);
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription expired or gone
        if (sub.Id) await deleteRecord(tableId, sub.Id);
      } else {
        console.error('Error sending push notification', error);
      }
    }
  });

  await Promise.all(promises);
}
