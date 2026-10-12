import { type ClassValue, clsx } from 'clsx';
import type { Reagent } from '@/types';

// Re-export shared utilities for convenience
export {
  getExpiryStatus,
  getDaysUntilExpiry,
  getStatusColor,
  formatDate,
} from '@expiry-alert/shared';

// Desktop-specific utility for combining class names
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function searchReagents(reagents: Reagent[], query: string): Reagent[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return reagents;
  return reagents.filter((r) =>
    [r.name, r.lot_number, r.manufacturer, r.supplier_name].some((field) =>
      field?.toLowerCase().includes(needle),
    ),
  );
}
