import type { Request } from 'express';

export function getTeamId(req: Request): number | null {
  const id = req.session.teamId;
  return typeof id === 'number' ? id : null;
}
