import type { Request } from 'express';

export type TeamId = number;

export function getTeamId(req: Request): TeamId | null {
  const id = req.session.teamId;
  if (typeof id === 'number') return id;
  if (typeof id === 'string') {
    const parsed = Number(id);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
