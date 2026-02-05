import { differenceInDays, parseISO, isValid } from 'date-fns';
import type { ExpiryStatus } from './types';

export function getExpiryStatus(expiryDate: string): ExpiryStatus {
  if (!expiryDate) return 'ok';
  const today = new Date();
  const expiry = parseISO(expiryDate);
  if (!isValid(expiry)) return 'ok';
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
  if (!expiryDate) return 0;
  const today = new Date();
  const expiry = parseISO(expiryDate);
  if (!isValid(expiry)) return 0;
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

export function formatDate(date: string | Date, locale: string = 'he-IL'): string {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '';
  return d.toLocaleDateString(locale);
}
