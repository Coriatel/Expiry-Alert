import { Router } from 'express';
import { z } from 'zod';
import { getTeamId } from '../utils/team.js';
import {
  createTeamPasswordResetToken,
  createInvite,
  createMembership,
  createTeam,
  ensureMembership,
  getTeamByName,
  getTeamByPasswordResetToken,
  isResetTokenExpired,
  listMembershipsByTeam,
  listMembershipsByUser,
  listTeams,
  setTeamPassword,
  verifyTeamPassword,
} from '../services/teams.js';
import { getUserByEmail, getUserById } from '../services/users.js';
import { sendEmail } from '../services/email.js';
import { config } from '../config.js';

export const teamsRouter = Router();

teamsRouter.get('/', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const memberships = await listMembershipsByUser(user.id);
  const teams = await listTeams();
  const membershipByTeam = new Map(memberships.map((m) => [m.team, m]));
  const userTeams = teams
    .filter((team) => team.id && membershipByTeam.has(team.id))
    .map((team) => ({
      ...team,
      role: membershipByTeam.get(team.id!)?.role ?? 'member',
    }));

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

  const parsed = z.object({ teamId: z.coerce.number() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const memberships = await listMembershipsByUser(user.id);
  const allowed = memberships.some((m) => m.team === parsed.data.teamId);
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });

  req.session.teamId = parsed.data.teamId;
  res.status(204).send();
});

teamsRouter.post('/join-with-password', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const parsed = z.object({
    teamName: z.string().min(1),
    password: z.string().min(6),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const team = await getTeamByName(parsed.data.teamName.trim());
  if (!team || !team.id) return res.status(404).json({ error: 'Team not found' });

  if (!verifyTeamPassword(team, parsed.data.password)) {
    return res.status(403).json({ error: 'Invalid team password' });
  }

  await ensureMembership(user.id, team.id, 'member');
  req.session.teamId = team.id;
  return res.status(200).json({ teamId: team.id, teamName: team.name });
});

teamsRouter.post('/:teamId/password', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const teamId = Number(req.params.teamId);
  if (!Number.isFinite(teamId)) return res.status(400).json({ error: 'Invalid team' });

  const parsed = z.object({
    password: z.string().min(6).max(128),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const memberships = await listMembershipsByUser(user.id);
  const membership = memberships.find((m) => m.team === teamId);
  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return res.status(403).json({ error: 'Only team admins can change team password' });
  }

  await setTeamPassword(teamId, parsed.data.password);
  return res.status(204).send();
});

teamsRouter.post('/password/forgot', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const parsed = z.object({
    teamName: z.string().min(1),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const team = await getTeamByName(parsed.data.teamName.trim());
  if (!team || !team.id) return res.status(404).json({ error: 'Team not found' });

  const memberships = await listMembershipsByUser(user.id);
  const allowed = memberships.some((m) => m.team === team.id);
  if (!allowed) return res.status(403).json({ error: 'Only team members can request reset email' });

  const owner = await getUserById(team.owner);
  if (!owner?.email) return res.status(500).json({ error: 'Team owner email is not available' });

  const { token } = await createTeamPasswordResetToken(team.id);
  const resetBase = config.apiBaseUrl || config.appBaseUrl;
  const resetLink = `${resetBase.replace(/\/+$/, '')}/api/teams/password/reset?token=${encodeURIComponent(token)}`;

  try {
    await sendEmail(
      owner.email,
      `Expiry Alert: reset team password for "${team.name}"`,
      `A password reset was requested for team "${team.name}". Reset link: ${resetLink}`,
      `<p>A password reset was requested for team <strong>${team.name}</strong>.</p><p><a href="${resetLink}">Reset team password</a></p>`
    );
  } catch (err) {
    console.error('Failed to send team reset email', err);
    return res.status(500).json({ error: 'Failed to send reset email. Please contact administrator.' });
  }

  return res.status(204).send();
});

teamsRouter.get('/password/reset', async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) return res.status(400).send('Missing reset token');

  const escapedToken = token.replace(/"/g, '&quot;');
  return res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reset Team Password</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    main { max-width: 460px; margin: 64px auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; }
    h1 { margin: 0 0 16px; font-size: 22px; }
    label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; }
    input { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 12px; }
    button { border: 0; background: #2563eb; color: #fff; border-radius: 8px; padding: 10px 14px; cursor: pointer; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .msg { margin-top: 12px; font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <h1>Reset Team Password</h1>
    <label for="password">New password</label>
    <input id="password" type="password" minlength="6" maxlength="128" required />
    <button id="submit">Save new password</button>
    <div class="msg" id="msg"></div>
  </main>
  <script>
    const token = "${escapedToken}";
    const button = document.getElementById('submit');
    const passwordInput = document.getElementById('password');
    const msg = document.getElementById('msg');
    button.addEventListener('click', async () => {
      const password = passwordInput.value.trim();
      if (password.length < 6) {
        msg.textContent = 'Password must be at least 6 characters.';
        return;
      }
      button.disabled = true;
      msg.textContent = 'Saving...';
      try {
        const response = await fetch('/api/teams/password/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to reset password');
        }
        msg.textContent = 'Team password updated. You can return to the app.';
      } catch (error) {
        msg.textContent = error.message || 'Failed to reset password';
      } finally {
        button.disabled = false;
      }
    });
  </script>
</body>
</html>`);
});

teamsRouter.post('/password/reset', async (req, res) => {
  const parsed = z.object({
    token: z.string().min(8),
    password: z.string().min(6).max(128),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const team = await getTeamByPasswordResetToken(parsed.data.token);
  if (!team || !team.id) return res.status(400).json({ error: 'Invalid reset token' });
  if (isResetTokenExpired(team)) return res.status(400).json({ error: 'Reset token expired' });

  await setTeamPassword(team.id, parsed.data.password);
  return res.status(204).send();
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
  if (!Number.isFinite(teamId)) return res.status(400).json({ error: 'Invalid team' });

  const memberships = await listMembershipsByUser(user.id);
  const current = memberships.find((m) => m.team === teamId);
  if (!current || (current.role !== 'owner' && current.role !== 'admin')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const invitedUser = await getUserByEmail(parsed.data.email);
  const role = parsed.data.role ?? 'member';

  if (invitedUser && invitedUser.id) {
    await createMembership({
      team: teamId,
      user: invitedUser.id,
      role,
      email_alerts_enabled: true,
    });
    return res.status(201).json({ status: 'added' });
  }

  await createInvite(teamId, parsed.data.email, role);
  res.status(201).json({ status: 'invited' });
});
