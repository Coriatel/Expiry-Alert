import { type ClassValue, clsx } from 'clsx';
import { differenceInDays, parseISO } from 'date-fns';
import type { ExpiryStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function getExpiryStatus(expiryDate: string): ExpiryStatus {
  const today = new Date();
  const expiry = parseISO(expiryDate);
  const daysUntilExpiry = differenceInDays(expiry, today);

  if (daysUntilExpiry < 0) {
    return 'expired';
  } else if (daysUntilExpiry <= 2) {
    return 'expiring-soon';
  } else if (daysUntilExpiry <= 7) {
    return 'expiring-week';
  }
  return 'ok';
}

export function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  const expiry = parseISO(expiryDate);
  return differenceInDays(expiry, today);
}

export function getStatusColor(status: ExpiryStatus): string {
  switch (status) {
    case 'expired':
      return 'status-expired';
    case 'expiring-soon':
      return 'status-expiring-soon';
    case 'expiring-week':
      return 'status-expiring-week';
    default:
      return 'status-ok';
  }
}

export function formatDate(date: string | Date): string {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return d.toLocaleDateString('he-IL');
}
