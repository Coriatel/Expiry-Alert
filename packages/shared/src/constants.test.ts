import { describe, it, expect } from 'vitest';
import {
  APP_NAME,
  APP_VERSION,
  DEFAULT_NOTIFICATION_DAYS,
  EXPIRY_WARNING_DAYS,
  EXPIRY_URGENT_DAYS,
  CATEGORIES,
  CATEGORY_LABELS,
  STATUS_COLORS,
  DB_NAME,
} from './constants';

describe('constants', () => {
  describe('APP constants', () => {
    it('should have correct app name', () => {
      expect(APP_NAME).toBe('Reagent Expiry Tracker');
    });

    it('should have valid app version format', () => {
      expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('Notification settings', () => {
    it('should have positive notification days', () => {
      expect(DEFAULT_NOTIFICATION_DAYS).toBeGreaterThan(0);
    });

    it('should have warning days greater than urgent days', () => {
      expect(EXPIRY_WARNING_DAYS).toBeGreaterThan(EXPIRY_URGENT_DAYS);
    });

    it('should have default days within warning range', () => {
      expect(DEFAULT_NOTIFICATION_DAYS).toBeLessThanOrEqual(EXPIRY_WARNING_DAYS);
    });
  });

  describe('Categories', () => {
    it('should have reagents category', () => {
      expect(CATEGORIES.REAGENTS).toBe('reagents');
    });

    it('should have beads category', () => {
      expect(CATEGORIES.BEADS).toBe('beads');
    });
  });

  describe('Category labels', () => {
    it('should have labels for reagents in both languages', () => {
      expect(CATEGORY_LABELS.reagents.en).toBe('Reagents');
      expect(CATEGORY_LABELS.reagents.he).toBe('ריאגנטים');
    });

    it('should have labels for beads in both languages', () => {
      expect(CATEGORY_LABELS.beads.en).toBe('Beads');
      expect(CATEGORY_LABELS.beads.he).toBe('כדוריות');
    });
  });

  describe('Status colors', () => {
    it('should have all required status colors', () => {
      expect(STATUS_COLORS.expired).toBeDefined();
      expect(STATUS_COLORS['expiring-soon']).toBeDefined();
      expect(STATUS_COLORS['expiring-week']).toBeDefined();
      expect(STATUS_COLORS.ok).toBeDefined();
    });

    it('should have valid hex color format', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      expect(STATUS_COLORS.expired).toMatch(hexColorRegex);
      expect(STATUS_COLORS['expiring-soon']).toMatch(hexColorRegex);
      expect(STATUS_COLORS['expiring-week']).toMatch(hexColorRegex);
      expect(STATUS_COLORS.ok).toMatch(hexColorRegex);
    });
  });

  describe('Database constants', () => {
    it('should have correct database name', () => {
      expect(DB_NAME).toBe('reagents.db');
    });
  });
});
