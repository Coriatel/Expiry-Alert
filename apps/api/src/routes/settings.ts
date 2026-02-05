import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getTeamId } from '../utils/team.js';
import { getNotificationSettings, updateNotificationSettings } from '../services/settings.js';

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

settingsRouter.get('/', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: 'Missing team' });

  const settings = await getNotificationSettings(teamId);
  if (!settings) return res.status(404).json({ error: 'Settings not found' });
  res.json(settings);
});

settingsRouter.put('/', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: 'Missing team' });

  const parsed = z
    .object({
      enabled: z.boolean(),
      remindInDays: z.number().int().min(1).max(365),
    })
    .safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const updated = await updateNotificationSettings(teamId, {
    enabled: parsed.data.enabled,
    remind_in_days: parsed.data.remindInDays,
  });

  res.json(updated);
});
