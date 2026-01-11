import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getExpiryStatus, getDaysUntilExpiry, getStatusColor, formatDate } from './utils';

describe('utils', () => {
  describe('getExpiryStatus', () => {
    beforeEach(() => {
      // Mock the current date to 2024-01-15
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "expired" for past dates', () => {
      expect(getExpiryStatus('2024-01-14')).toBe('expired');
      expect(getExpiryStatus('2024-01-10')).toBe('expired');
      expect(getExpiryStatus('2023-12-31')).toBe('expired');
    });

    it('should return "expiring-soon" for dates within 0-2 days', () => {
      expect(getExpiryStatus('2024-01-15')).toBe('expiring-soon'); // Today
      expect(getExpiryStatus('2024-01-16')).toBe('expiring-soon'); // Tomorrow
      expect(getExpiryStatus('2024-01-17')).toBe('expiring-soon'); // In 2 days
    });

    it('should return "expiring-week" for dates within 3-7 days', () => {
      expect(getExpiryStatus('2024-01-18')).toBe('expiring-week'); // In 3 days
      expect(getExpiryStatus('2024-01-20')).toBe('expiring-week'); // In 5 days
      expect(getExpiryStatus('2024-01-22')).toBe('expiring-week'); // In 7 days
    });

    it('should return "ok" for dates more than 7 days away', () => {
      expect(getExpiryStatus('2024-01-23')).toBe('ok'); // In 8 days
      expect(getExpiryStatus('2024-02-15')).toBe('ok'); // In 31 days
      expect(getExpiryStatus('2025-01-15')).toBe('ok'); // In 1 year
    });
  });

  describe('getDaysUntilExpiry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return negative days for expired dates', () => {
      expect(getDaysUntilExpiry('2024-01-14')).toBe(-1);
      expect(getDaysUntilExpiry('2024-01-10')).toBe(-5);
    });

    it('should return 0 for today', () => {
      expect(getDaysUntilExpiry('2024-01-15')).toBe(0);
    });

    it('should return positive days for future dates', () => {
      expect(getDaysUntilExpiry('2024-01-16')).toBe(1);
      expect(getDaysUntilExpiry('2024-01-22')).toBe(7);
      expect(getDaysUntilExpiry('2024-02-15')).toBe(31);
    });
  });

  describe('getStatusColor', () => {
    it('should return correct CSS class for expired status', () => {
      expect(getStatusColor('expired')).toBe('status-expired');
    });

    it('should return correct CSS class for expiring-soon status', () => {
      expect(getStatusColor('expiring-soon')).toBe('status-expiring-soon');
    });

    it('should return correct CSS class for expiring-week status', () => {
      expect(getStatusColor('expiring-week')).toBe('status-expiring-week');
    });

    it('should return correct CSS class for ok status', () => {
      expect(getStatusColor('ok')).toBe('status-ok');
    });
  });

  describe('formatDate', () => {
    it('should format a date string correctly for Hebrew locale', () => {
      const formatted = formatDate('2024-01-15', 'he-IL');
      // Hebrew locale uses DD.MM.YYYY format
      expect(formatted).toBeTruthy();
      expect(formatted).toContain('15');
      expect(formatted).toContain('1');
      expect(formatted).toContain('2024');
    });

    it('should format a date string correctly for English locale', () => {
      const formatted = formatDate('2024-01-15', 'en-US');
      expect(formatted).toBeTruthy();
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-15');
      const formatted = formatDate(date, 'en-US');
      expect(formatted).toBeTruthy();
    });

    it('should return empty string for empty input', () => {
      expect(formatDate('')).toBe('');
    });
  });
});
