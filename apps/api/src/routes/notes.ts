import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getTeamId } from '../utils/team.js';
import { createNote, deleteNote, listNotes } from '../services/notes.js';

export const notesRouter = Router();

notesRouter.use(requireAuth);

notesRouter.get('/', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: 'Missing team' });

  const notes = await listNotes(teamId);
  res.json(notes);
});

notesRouter.post('/', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: 'Missing team' });

  const parsed = z.object({ content: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  await createNote(teamId, parsed.data.content);
  res.status(201).json({ id: Date.now() });
});

notesRouter.delete('/:id', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: 'Missing team' });

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

  await deleteNote(id);
  res.status(204).send();
});
