import type { Gs1Label } from "./gs1";

// A label is used only once two frames read the same lot and expiry, with no more than a few misses
// in between: one misread frame can still parse. A code found only in one of the five rotating
// crops is seen every fifth frame, hence four misses.
const MAX_MISSES = 4;
// A code with only a lot (Immucor REF/LOT) or only an expiry is used if no complete code turns
// up by then.
const PARTIAL_WAIT_MS = 2500;

export interface PendingLabel {
  key: string;
  since: number;
  seen: number;
  misses: number;
}

// Called once per frame with that frame's pickLabel result. A label is accepted only on a frame
// that itself reads it, never from what earlier frames saw; labels that conflict drop it.
export function confirmLabel(
  pending: PendingLabel | null,
  label: Gs1Label | null,
  conflict: boolean,
  now: number,
): { pending: PendingLabel | null; accepted: Gs1Label | null } {
  if (conflict) return { pending: null, accepted: null };
  if (!label) {
    const misses = (pending?.misses ?? 0) + 1;
    return {
      pending: pending && misses <= MAX_MISSES ? { ...pending, misses } : null,
      accepted: null,
    };
  }
  const key = `${label.lot}|${label.expiryDate}`;
  const next =
    pending?.key === key
      ? { ...pending, seen: pending.seen + 1, misses: 0 }
      : { key, since: now, seen: 1, misses: 0 };
  const complete = !!label.lot && !!label.expiryDate;
  const accepted =
    next.seen >= 2 && (complete || now - next.since >= PARTIAL_WAIT_MS)
      ? label
      : null;
  return { pending: next, accepted };
}
