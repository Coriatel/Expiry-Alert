// App constants shared across platforms

export const APP_NAME = 'Reagent Expiry Tracker';
export const APP_VERSION = '1.0.0';

// Notification settings
export const DEFAULT_NOTIFICATION_DAYS = 5;
export const EXPIRY_WARNING_DAYS = 7;
export const EXPIRY_URGENT_DAYS = 2;

// Categories
export const CATEGORIES = {
  REAGENTS: 'reagents',
  BEADS: 'beads',
} as const;

export const CATEGORY_LABELS = {
  reagents: {
    en: 'Reagents',
    he: 'ריאגנטים',
  },
  beads: {
    en: 'Beads',
    he: 'כדוריות',
  },
} as const;

// Status colors
export const STATUS_COLORS = {
  expired: '#EF4444',      // red-500
  'expiring-soon': '#F97316', // orange-500
  'expiring-week': '#EAB308', // yellow-500
  ok: '#22C55E',           // green-500
} as const;

// Database
export const DB_NAME = 'reagents.db';
export const DB_PATH_WINDOWS = '%LOCALAPPDATA%\\reagent-expiry-tracker';
export const DB_PATH_ANDROID = 'reagent-expiry-tracker';
export const DB_PATH_IOS = 'reagent-expiry-tracker';
