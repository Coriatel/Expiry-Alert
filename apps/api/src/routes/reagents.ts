import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getTeamId } from '../utils/team.js';
import { bulkUpdate, createReagent, listReagents, removeReagent, updateReagent } from '../services/reagents.js';
import { getNotificationSettings } from '../services/settings.js';

export const reagentsRouter = Router();

const reagentSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['reagents', 'beads']),
  expiryDate: z.string().min(1),
  lotNumber: z.string().optional().nullable(),
  receivedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const bulkSchema = z.object({
  reagents: z.array(reagentSchema),
});

const idsSchema = z.object({
  ids: z.array(z.string()),
});

const isDateAfter = (value: string | null | undefined, compareTo: Date) => {
  if (!value) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed > compareTo;
};

reagentsRouter.use(requireAuth);

reagentsRouter.get('/', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: 'Missing team' });

  const scope = String(req.query.scope ?? 'active');
  const reagents = await listReagents(teamId);

  if (scope === 'all') {
    return res.json(reagents);
  }

  if (scope === 'archived') {
    return res.json(reagents.filter((r) => r.is_archived));
  }

  if (scope === 'expiring') {
    const settings = await getNotificationSettings(teamId);
    const remindDays = settings?.remind_in_days ?? 30;
    const now = new Date();
    const cutoff = new Date(now.getTime() + remindDays * 86400000);

    const expiring = reagents.filter((r) => {
      if (r.is_archived) return false;
      if (isDateAfter(r.snoozed_until ?? null, now)) return false;
      if (isDateAfter(r.dismissed_until ?? null, now)) return false;
      const expiry = new Date(r.expiry_date);
      if (!Number.isFinite(expiry.getTime())) return false;
      return expiry <= cutoff;
    });
    return res.json(expiring);
  }

  return res.json(reagents.filter((r) => !r.is_archived));
});

reagentsRouter.post('/', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: 'Missing team' });

  const parsed = reagentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  await createReagent(teamId, {
    name: parsed.data.name,
    category: parsed.data.category,
    expiry_date: parsed.data.expiryDate,
    lot_number: parsed.data.lotNumber ?? null,
    received_date: parsed.data.receivedDate ?? null,
    notes: parsed.data.notes ?? null,
    is_archived: false,
  });

  res.status(201).json({ status: 'created' });
});

reagentsRouter.post('/bulk', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: 'Missing team' });

  const parsed = bulkSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  for (const reagent of parsed.data.reagents) {
    await createReagent(teamId, {
      name: reagent.name,
      category: reagent.category,
      expiry_date: reagent.expiryDate,
      lot_number: reagent.lotNumber ?? null,
      received_date: reagent.receivedDate ?? null,
      notes: reagent.notes ?? null,
      is_archived: false,
    });
  }

  res.status(201).json({ status: 'ok' });
});

reagentsRouter.put('/:id', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: 'Missing team' });

  const id = req.params.id;
  
  const parsed = reagentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  await updateReagent(id, {
    name: parsed.data.name,
    category: parsed.data.category,
    expiry_date: parsed.data.expiryDate,
    lot_number: parsed.data.lotNumber ?? null,
    received_date: parsed.data.receivedDate ?? null,
    notes: parsed.data.notes ?? null,
  });

  res.status(204).send();
});

reagentsRouter.delete('/:id', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: 'Missing team' });

  const id = req.params.id;
  await removeReagent(id);
  res.status(204).send();
});

reagentsRouter.post('/delete', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: 'Missing team' });

  const parsed = idsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  for (const id of parsed.data.ids) {
    await removeReagent(id);
  }

  res.status(204).send();
});

reagentsRouter.post('/archive', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: 'Missing team' });

  const parsed = idsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  await bulkUpdate(parsed.data.ids, {
    is_archived: true,
  });

  res.status(204).send();
});

reagentsRouter.post('/:id/archive', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: 'Missing team' });

  const id = req.params.id;
  await updateReagent(id, {
    is_archived: true,
  });

  res.status(204).send();
});

reagentsRouter.post('/:id/restore', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: 'Missing team' });

  const id = req.params.id;
  await updateReagent(id, {
    is_archived: false,
  });

  res.status(204).send();
});