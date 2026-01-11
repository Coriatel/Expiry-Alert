import { type ClassValue, clsx } from 'clsx';

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
