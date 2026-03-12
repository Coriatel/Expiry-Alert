import webpush, { PushSubscription } from 'web-push';
import { config } from '../config.js';
import { createRecord, deleteRecord, listRecords, updateSingleRecord } from './directus.js';

if (config.vapid.publicKey && config.vapid.privateKey) {
  webpush.setVapidDetails(
    config.vapid.subject,
    config.vapid.publicKey,
    config.vapid.privateKey
  );
}

export interface PushSubscriptionRecord {
  id: number;
  user: number; // FK
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  date_created?: string;
}

const collection = config.directus.collections.pushSubscriptions as any;

export interface PushSendResult {
  total: number;
  sent: number;
  expired: number;
  failed: number;
}

export async function saveSubscription(userId: number, subscription: PushSubscription) {
  const existing = await listRecords<PushSubscriptionRecord>(collection, {
    filter: { endpoint: { _eq: subscription.endpoint } },
  });

  if (existing.length > 0) {
    await updateSingleRecord(collection, existing[0].id, {
      user: userId,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
    return;
  }

  await createRecord(collection, {
    user: userId,
    endpoint: subscription.endpoint,
    keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
    },
  });
}

export async function removeSubscription(endpoint: string) {
  const existing = await listRecords<PushSubscriptionRecord>(collection, {
    filter: { endpoint: { _eq: endpoint } },
  });

  if (existing.length > 0) {
    await deleteRecord(collection, existing[0].id);
  }
}

export async function sendNotificationToUser(userId: number, payload: any): Promise<PushSendResult> {
  const subscriptions = await listRecords<PushSubscriptionRecord>(collection, {
    filter: { user: { _eq: userId } },
  });

  const notificationPayload = JSON.stringify(payload);
  const result: PushSendResult = {
    total: subscriptions.length,
    sent: 0,
    expired: 0,
    failed: 0,
  };

  const promises = subscriptions.map(async (sub) => {
    const keys = typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys;
    
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSub, notificationPayload);
      result.sent += 1;
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        result.expired += 1;
        if (sub.id) await deleteRecord(collection, sub.id);
      } else {
        result.failed += 1;
        console.error('Error sending push notification', error);
      }
    }
  });

  await Promise.all(promises);
  return result;
}
