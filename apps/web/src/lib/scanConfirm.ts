import type { Gs1Label } from "./gs1";

// A label is used only once two frames read the same lot and expiry, with no more than a few misses
// in between: one misread frame can still parse. A code found only in one of the five rotating
// crops is seen every fifth frame, hence four misses.
const MAX_MISSES = 4;
// A code with only a lot (Immucor REF/LOT) or only an expiry is used if no complete code turns
// up by then.
const PARTIAL_WAIT_MS = 2500;

export interface PendingLabel {
  lot?: string;
  expiryDate?: string;
  since: number;
  seen: number;
  misses: number;
}

const isComplete = (l: { lot?: string; expiryDate?: string }) => !!l.lot && !!l.expiryDate;
// A partial label that matches a complete one on every field it has, e.g. an Immucor blister's
// REF/LOT code next to its UDI: the REF/LOT code is read every frame, the UDI often only in a crop.
const agrees = (partial: Gs1Label, complete: PendingLabel | Gs1Label) =>
  (!partial.lot || partial.lot === complete.lot) &&
  (!partial.expiryDate || partial.expiryDate === complete.expiryDate);

// Called once per frame with that frame's pickLabel result. A label is accepted only on a frame
// that itself reads it, never from what earlier frames saw; labels that conflict drop it.
export function confirmLabel(
  pending: PendingLabel | null,
  label: Gs1Label | null,
  conflict: boolean,
  now: number,
): { pending: PendingLabel | null; accepted: Gs1Label | null } {
  if (conflict) return { pending: null, accepted: null };
  // A matching partial does not reset a complete candidate: it counts as a frame without it.
  if (!label || (pending && isComplete(pending) && !isComplete(label) && agrees(label, pending))) {
    const misses = (pending?.misses ?? 0) + 1;
    return {
      pending: pending && misses <= MAX_MISSES ? { ...pending, misses } : null,
      accepted: null,
    };
  }
  const same = pending?.lot === label.lot && pending?.expiryDate === label.expiryDate;
  // A complete label that fills in a partial candidate replaces it but keeps its start time; it
  // still needs a second sighting of its own.
  const upgrade =
    !!pending && !isComplete(pending) && isComplete(label) && agrees(pending, label);
  const next: PendingLabel = same
    ? { ...pending!, seen: pending!.seen + 1, misses: 0 }
    : {
        lot: label.lot,
        expiryDate: label.expiryDate,
        since: upgrade ? pending!.since : now,
        seen: 1,
        misses: 0,
      };
  const accepted =
    next.seen >= 2 && (isComplete(label) || now - next.since >= PARTIAL_WAIT_MS)
      ? label
      : null;
  return { pending: next, accepted };
}
