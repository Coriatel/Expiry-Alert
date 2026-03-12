import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getTeamId } from '../utils/team.js';
import { updateReagent } from '../services/reagents.js';
import {
  dismissNotificationLog,
  AlertType,
  isRecurringAlertType,
} from '../services/notificationLog.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.post('/:id/snooze', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: 'Missing team' });

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

  const parsed = z.object({ days: z.number().int().min(1).max(365) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const snoozedUntil = new Date(Date.now() + parsed.data.days * 86400000).toISOString();
  await updateReagent(id, {
    snoozed_until: snoozedUntil,
  });

  res.status(204).send();
});

const validAlertTypes: AlertType[] = ['7day', '2day', '1day', '0day', 'expired', '5day_summary'];

notificationsRouter.post('/:id/dismiss', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: 'Missing team' });

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

  const userId = (req.user as any)?.id;
  const alertType = req.body?.alertType as AlertType | undefined;

  if (alertType && validAlertTypes.includes(alertType)) {
    // New smart dismiss: log-based
    await dismissNotificationLog(id, userId, alertType);
  }

  // Also set legacy reagent-level dismiss for in-app banner compatibility
  // 7day or no alertType: permanent dismiss (10 years)
  // Recurring alerts: 24-hour dismiss
  const isRecurring = alertType ? isRecurringAlertType(alertType) : false;
  const dismissMs = isRecurring ? 86400000 : 3650 * 86400000;
  const dismissedUntil = new Date(Date.now() + dismissMs).toISOString();

  await updateReagent(id, {
    dismissed_until: dismissedUntil,
  });

  res.status(204).send();
});
