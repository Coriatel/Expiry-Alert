import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { listReagents, ReagentRecord } from '../services/reagents.js';
import { generateCalendar, generateSingleReagentCalendar } from '../services/calendar.js';
import { createGoogleCalendarEvents } from '../services/googleCalendar.js';
import { getTeamId } from '../utils/team.js';

export const calendarRouter = Router();

const createGoogleEventsSchema = z.object({
  reagentIds: z.array(z.coerce.number()).min(1),
  mode: z.enum(['single', 'separate']).default('single'),
  alertAt: z.string().min(1),
});

function formatReagentLine(reagent: ReagentRecord): string {
  return `- ${reagent.name} (expiry: ${reagent.expiry_date})`;
}

function buildSingleEventDescription(reagent: ReagentRecord) {
  const lines = [
    `Reagent: ${reagent.name}`,
    `Category: ${reagent.category}`,
    `Expiry date: ${reagent.expiry_date}`,
  ];

  if (reagent.lot_number) lines.push(`LOT: ${reagent.lot_number}`);
  if (reagent.notes) lines.push(`Notes: ${reagent.notes}`);

  return lines.join('\n');
}

function buildGroupEventDescription(reagents: ReagentRecord[]) {
  return [
    'Selected active reagents:',
    ...reagents.map(formatReagentLine),
  ].join('\n');
}

calendarRouter.use(requireAuth);

calendarRouter.get('/google/status', (req, res) => {
  const connected = Boolean(req.session.googleCalendar?.accessToken);
  res.json({ connected });
});

calendarRouter.post('/google/disconnect', (req, res) => {
  delete req.session.googleCalendar;
  res.status(204).send();
});

calendarRouter.post('/google/events', async (req, res) => {
  try {
    const auth = req.session.googleCalendar;
    if (!auth?.accessToken) {
      return res.status(400).json({ error: 'Google Calendar is not connected' });
    }

    const teamId = getTeamId(req);
    if (!teamId) {
      return res.status(400).json({ error: 'Missing team' });
    }

    const parsed = createGoogleEventsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const alertAt = new Date(parsed.data.alertAt);
    if (!Number.isFinite(alertAt.getTime())) {
      return res.status(400).json({ error: 'Invalid alert date/time' });
    }

    const reagents = await listReagents(teamId);
    const selected = reagents.filter(
      (reagent) =>
        !reagent.is_archived &&
        parsed.data.reagentIds.includes(Number(reagent.id))
    );

    if (selected.length === 0) {
      return res.status(400).json({ error: 'No active reagents selected' });
    }

    const start = alertAt.toISOString();
    const end = new Date(alertAt.getTime() + 30 * 60 * 1000).toISOString();

    const events =
      parsed.data.mode === 'single'
        ? [
            {
              summary:
                selected.length === 1
                  ? `Reagent expiry alert: ${selected[0]!.name}`
                  : `Reagent expiry alerts (${selected.length})`,
              description: buildGroupEventDescription(selected),
              start,
              end,
            },
          ]
        : selected.map((reagent) => ({
            summary: `Reagent expiry alert: ${reagent.name}`,
            description: buildSingleEventDescription(reagent),
            start,
            end,
          }));

    const result = await createGoogleCalendarEvents(auth, events);
    req.session.googleCalendar = result.auth;

    return res.json({
      created: result.events.length,
      links: result.events.map((event) => event.htmlLink).filter(Boolean),
      mode: parsed.data.mode,
    });
  } catch (error) {
    console.error('Google Calendar create events error:', error);
    return res.status(500).json({ error: 'Failed to create Google Calendar events' });
  }
});

/**
 * GET /api/calendar/export.ics
 * Export all non-archived reagents as ICS calendar
 */
calendarRouter.get('/export.ics', async (req, res) => {
  try {
    const teamId = getTeamId(req);
    if (!teamId) {
      return res.status(400).json({ error: 'Missing team' });
    }

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
calendarRouter.get('/reagent/:id.ics', async (req, res) => {
  try {
    const teamId = getTeamId(req);
    if (!teamId) {
      return res.status(400).json({ error: 'Missing team' });
    }

    const reagentId = req.params.id?.trim();
    if (!reagentId) {
      return res.status(400).json({ error: 'Invalid reagent ID' });
    }

    const reagents = await listReagents(teamId);
    const reagent = reagents.find((r) => String(r.id) === reagentId);

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
