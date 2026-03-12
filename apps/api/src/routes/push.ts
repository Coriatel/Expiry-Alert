import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { saveSubscription, removeSubscription, sendNotificationToUser } from '../services/push.js';

export const pushRouter = Router();

pushRouter.use(requireAuth);

pushRouter.post('/subscribe', async (req, res) => {
  const user = req.user as any;
  if (!user || !user.id) return res.status(401).json({ error: 'Unauthorized' });

  const subscription = req.body;
  // Basic validation
  if (!subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription' });
  }

  try {
    await saveSubscription(user.id, subscription);
    res.status(201).json({});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

pushRouter.delete('/unsubscribe', async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Endpoint required' });

    try {
        await removeSubscription(endpoint);
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
});

pushRouter.post('/test', async (req, res) => {
    const user = req.user as any;
    try {
        const result = await sendNotificationToUser(user.id, {
            title: 'Test Notification',
            body: 'This is a test notification from Expiry Alert',
            icon: '/icon-192.png'
        });
        if (result.total === 0) {
            return res.status(409).json({ error: 'No active push subscription for this device' });
        }
        if (result.sent === 0) {
            return res.status(502).json({ error: 'Failed to deliver test notification' });
        }
        res.json({ success: true, sent: result.sent });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to send test notification' });
    }
});
