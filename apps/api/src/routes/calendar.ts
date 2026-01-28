import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listReagents, ReagentRecord } from '../services/reagents.js';
import { generateCalendar, generateSingleReagentCalendar } from '../services/calendar.js';

export const calendarRouter = Router();

/**
 * GET /api/calendar/export.ics
 * Export all non-archived reagents as ICS calendar
 */
calendarRouter.get('/export.ics', requireAuth, async (req, res) => {
  try {
    const teamId = req.user!.teamId;
    const reagents = await listReagents(teamId);

    const icsContent = await generateCalendar(reagents);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reagent-expiry.ics"');
    res.send(icsContent);
  } catch (error) {
    console.error('Calendar export error:', error);
    res.status(500).json({ error: 'Failed to generate calendar' });
  }
});

/**
 * GET /api/calendar/reagent/:id.ics
 * Export a single reagent as ICS calendar event
 */
calendarRouter.get('/reagent/:id.ics', requireAuth, async (req, res) => {
  try {
    const teamId = req.user!.teamId;
    const reagentId = parseInt(req.params.id, 10);

    if (isNaN(reagentId)) {
      return res.status(400).json({ error: 'Invalid reagent ID' });
    }

    const reagents = await listReagents(teamId);
    const reagent = reagents.find((r) => (r.Id || r.id) === reagentId);

    if (!reagent) {
      return res.status(404).json({ error: 'Reagent not found' });
    }

    const icsContent = await generateSingleReagentCalendar(reagent);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reagent-${reagentId}.ics"`);
    res.send(icsContent);
  } catch (error) {
    console.error('Calendar export error:', error);
    res.status(500).json({ error: 'Failed to generate calendar' });
  }
});
