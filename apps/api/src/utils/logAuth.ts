/// Guard for mutating a team-scoped log entry (destruction / duplication history).
/// A log row may only be edited or deleted by the team that owns it.
export type LogAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export function authorizeLogMutation(
  entry: { team?: number | null } | null | undefined,
  teamId: number | null | undefined,
): LogAuthResult {
  if (!teamId) return { ok: false, status: 400, error: "Missing team" };
  if (!entry) return { ok: false, status: 404, error: "Not found" };
  if (entry.team !== teamId)
    return { ok: false, status: 403, error: "Not your team's record" };
  return { ok: true };
}
