import type { Request, Response, NextFunction } from 'express';
import { getTeamById, listMembershipsByUser } from '../services/teams.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

export async function requireTeamApproved(req: Request, res: Response, next: NextFunction) {
  const teamId = req.session.teamId;
  if (!teamId) return res.status(403).json({ error: 'No team selected' });

  const team = await getTeamById(teamId);
  if (!team) return res.status(403).json({ error: 'Team not found' });
  if (team.approved === false) {
    return res.status(403).json({ error: 'Team pending approval' });
  }
  return next();
}

export async function requireActiveMembership(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const teamId = req.session.teamId;
  if (!teamId) return next();

  const memberships = await listMembershipsByUser(user.id);
  const membership = memberships.find((m) => m.team === teamId);
  if (membership?.status === 'suspended') {
    return res.status(403).json({ error: 'Your account has been suspended' });
  }
  return next();
}
