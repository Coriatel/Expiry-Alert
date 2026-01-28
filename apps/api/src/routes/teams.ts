import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getTeamId } from '../utils/team.js';
import {
  createInvite,
  createMembership,
  createTeam,
  ensureMembership,
  listMembershipsByTeam,
  listMembershipsByUser,
  listTeams,
} from '../services/teams.js';
import { getUserByEmail } from '../services/users.js';

export const teamsRouter = Router();

teamsRouter.use(requireAuth);

teamsRouter.get('/', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const memberships = await listMembershipsByUser(user.id);
  const teams = await listTeams();
  const teamIds = new Set(memberships.map((m) => m.team_id));
  const userTeams = teams.filter((team) => team.id && teamIds.has(team.id));

  res.json({
    teams: userTeams,
    currentTeamId: req.session.teamId ?? null,
  });
});

teamsRouter.post('/', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const team = await createTeam(parsed.data.name, user.id);
  if (!team || !team.id) return res.status(500).json({ error: 'Failed to create team' });

  await ensureMembership(user.id, team.id, 'owner');
  req.session.teamId = team.id;

  res.status(201).json(team);
});

teamsRouter.post('/switch', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const parsed = z.object({ teamId: z.number().int() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const memberships = await listMembershipsByUser(user.id);
  const allowed = memberships.some((m) => m.team_id === parsed.data.teamId);
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });

  req.session.teamId = parsed.data.teamId;
  res.status(204).send();
});

teamsRouter.get('/members', async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: 'Missing team' });

  const memberships = await listMembershipsByTeam(teamId);
  res.json({ memberships });
});

teamsRouter.post('/:teamId/members', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const parsed = z
    .object({ email: z.string().email(), role: z.enum(['owner', 'admin', 'member']).optional() })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const teamId = Number(req.params.teamId);
  if (!Number.isFinite(teamId)) return res.status(400).json({ error: 'Invalid team id' });

  const memberships = await listMembershipsByUser(user.id);
  const current = memberships.find((m) => m.team_id === teamId);
  if (!current || (current.role !== 'owner' && current.role !== 'admin')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const invitedUser = await getUserByEmail(parsed.data.email);
  const role = parsed.data.role ?? 'member';

  if (invitedUser && invitedUser.id) {
    await createMembership({
      team_id: teamId,
      user_id: invitedUser.id,
      role,
      email_alerts_enabled: true,
      created_at: new Date().toISOString(),
    });
    return res.status(201).json({ status: 'added' });
  }

  await createInvite(teamId, parsed.data.email, role);
  res.status(201).json({ status: 'invited' });
});
