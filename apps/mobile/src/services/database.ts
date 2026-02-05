import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { Reagent, GeneralNote } from '@expiry-alert/shared';

const DB_NAME = 'reagents.db';
/**
 * Input validation error
 */
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate reagent input data
 */
function validateReagentInput(
  name: string,
  category: string,
  expiryDate: string
): void {
  if (!name || name.trim().length === 0) {
    throw new ValidationError('Name cannot be empty');
  }
  if (name.length > 255) {
    throw new ValidationError('Name too long (max 255 characters)');
  }
  if (category !== 'reagents' && category !== 'beads') {
    throw new ValidationError("Invalid category (must be 'reagents' or 'beads')");
  }
  if (!expiryDate || expiryDate.trim().length === 0) {
    throw new ValidationError('Expiry date cannot be empty');
  }
  // Basic date format validation (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(expiryDate)) {
    throw new ValidationError('Invalid expiry date format (expected YYYY-MM-DD)');
  }
}

class DatabaseService {
  private db: SQLiteDatabase | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database (singleton pattern)
   */
  async init(): Promise<void> {
    // If already initialized, return immediately
    if (this.initialized && this.db) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this._doInit();

    try {
      await this.initPromise;
      this.initialized = true;
    } finally {
      this.initPromise = null;
    }
  }

  private async _doInit(): Promise<void> {
    this.db = await openDatabaseAsync(DB_NAME);
    await this.runMigrations();
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const db = this.db;

    await db.withTransactionAsync(async () => {
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS db_version (
          version INTEGER PRIMARY KEY
        );`
      );

      const row = await db.getFirstAsync<{ version: number }>(
        'SELECT COALESCE(MAX(version), 0) as version FROM db_version'
      );
      const currentVersion = row?.version ?? 0;

      if (currentVersion < 1) {
        await this.migrateV1(db);
      }

      if (currentVersion < 2) {
        await this.migrateV2(db);
      }
    });
  }

  /**
   * Migration to version 1 - initial schema
   */
  private async migrateV1(db: SQLiteDatabase): Promise<void> {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS reagents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('reagents', 'beads')),
        expiry_date TEXT NOT NULL,
        lot_number TEXT,
        received_date TEXT,
        notes TEXT,
        is_archived INTEGER DEFAULT 0 CHECK(is_archived IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`
    );

    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_reagents_expiry ON reagents(expiry_date);'
    );
    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_reagents_archived ON reagents(is_archived);'
    );

    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS general_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      );`
    );

    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS notification_settings (
        id INTEGER PRIMARY KEY,
        enabled INTEGER DEFAULT 1 CHECK(enabled IN (0, 1)),
        remind_in_days INTEGER DEFAULT 5 CHECK(remind_in_days >= 1 AND remind_in_days <= 365)
      );`
    );

    await db.runAsync(
      'INSERT OR IGNORE INTO notification_settings (id, enabled, remind_in_days) VALUES (1, 1, 5);'
    );

    await db.runAsync('INSERT OR REPLACE INTO db_version (version) VALUES (?);', [1]);
  }

  /**
   * Migration to version 2 - notification schedule tracking
   */
  private async migrateV2(db: SQLiteDatabase): Promise<void> {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS notification_schedule (
        reagent_id INTEGER PRIMARY KEY,
        notification_id TEXT NOT NULL,
        scheduled_for TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        remind_days INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );`
    );

    await db.runAsync('INSERT OR REPLACE INTO db_version (version) VALUES (?);', [2]);
  }

  /**
   * Ensure database is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.db || !this.initialized) {
      throw new Error('Database not initialized. Call init() first.');
    }
  }

  // ==================== Reagent Operations ====================

  /**
   * Get active (non-archived) reagents
   */
  async getActiveReagents(): Promise<Reagent[]> {
    await this.init();
    this.ensureInitialized();

    const rows = await this.db!.getAllAsync<Omit<Reagent, 'is_archived'> & { is_archived: number }>(
      'SELECT * FROM reagents WHERE is_archived = 0 ORDER BY expiry_date ASC'
    );

    return rows.map((row) => ({
      ...row,
      is_archived: row.is_archived === 1,
    }));
  }

  /**
   * Get archived reagents
   */
  async getArchivedReagents(): Promise<Reagent[]> {
    await this.init();
    this.ensureInitialized();

    const rows = await this.db!.getAllAsync<Omit<Reagent, 'is_archived'> & { is_archived: number }>(
      'SELECT * FROM reagents WHERE is_archived = 1 ORDER BY updated_at DESC'
    );

    return rows.map((row) => ({
      ...row,
      is_archived: row.is_archived === 1,
    }));
  }

  /**
   * Add a new reagent
   */
  async addReagent(
    name: string,
    category: string,
    expiryDate: string,
    lotNumber?: string,
    receivedDate?: string,
    notes?: string
  ): Promise<number> {
    await this.init();
    this.ensureInitialized();

    // Validate input
    validateReagentInput(name, category, expiryDate);

    const now = new Date().toISOString();
    const result = await this.db!.runAsync(
      `INSERT INTO reagents (name, category, expiry_date, lot_number, received_date, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        category,
        expiryDate,
        lotNumber || null,
        receivedDate || null,
        notes || null,
        now,
        now,
      ]
    );

    return result.lastInsertRowId;
  }

  /**
   * Update an existing reagent
   */
  async updateReagent(
    id: number,
    name: string,
    category: string,
    expiryDate: string,
    lotNumber?: string,
    receivedDate?: string,
    notes?: string
  ): Promise<void> {
    await this.init();
    this.ensureInitialized();

    // Validate input
    validateReagentInput(name, category, expiryDate);

    const now = new Date().toISOString();

    await this.db!.runAsync(
      `UPDATE reagents
       SET name = ?, category = ?, expiry_date = ?, lot_number = ?, received_date = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        name.trim(),
        category,
        expiryDate,
        lotNumber || null,
        receivedDate || null,
        notes || null,
        now,
        id,
      ]
    );
  }

  /**
   * Archive a reagent
   */
  async archiveReagent(id: number): Promise<void> {
    await this.init();
    this.ensureInitialized();

    const now = new Date().toISOString();

    await this.db!.runAsync(
      'UPDATE reagents SET is_archived = 1, updated_at = ? WHERE id = ?',
      [now, id]
    );
  }

  /**
   * Restore an archived reagent
   */
  async restoreReagent(id: number): Promise<void> {
    await this.init();
    this.ensureInitialized();

    const now = new Date().toISOString();

    await this.db!.runAsync(
      'UPDATE reagents SET is_archived = 0, updated_at = ? WHERE id = ?',
      [now, id]
    );
  }

  /**
   * Delete a reagent permanently
   */
  async deleteReagent(id: number): Promise<void> {
    await this.init();
    this.ensureInitialized();

    await this.db!.runAsync('DELETE FROM reagents WHERE id = ?', [id]);
  }

  // ==================== General Notes Operations ====================

  /**
   * Get all general notes
   */
  async getGeneralNotes(): Promise<GeneralNote[]> {
    await this.init();
    this.ensureInitialized();

    return this.db!.getAllAsync<GeneralNote>(
      'SELECT * FROM general_notes ORDER BY created_at DESC'
    );
  }

  /**
   * Add a new general note
   */
  async addGeneralNote(content: string): Promise<number> {
    await this.init();
    this.ensureInitialized();

    // Validate content
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new ValidationError('Note content cannot be empty');
    }
    if (trimmedContent.length > 10000) {
      throw new ValidationError('Note content too long (max 10000 characters)');
    }

    const now = new Date().toISOString();

    const result = await this.db!.runAsync(
      'INSERT INTO general_notes (content, created_at) VALUES (?, ?)',
      [trimmedContent, now]
    );

    return result.lastInsertRowId;
  }

  /**
   * Delete a general note
   */
  async deleteGeneralNote(id: number): Promise<void> {
    await this.init();
    this.ensureInitialized();

    await this.db!.runAsync('DELETE FROM general_notes WHERE id = ?', [id]);
  }

  // ==================== Notification Settings ====================

  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<{ enabled: boolean; remindDays: number }> {
    await this.init();
    this.ensureInitialized();

    const row = await this.db!.getFirstAsync<{ enabled: number; remind_in_days: number }>(
      'SELECT enabled, remind_in_days FROM notification_settings WHERE id = 1'
    );

    if (row) {
      return {
        enabled: row.enabled === 1,
        remindDays: row.remind_in_days,
      };
    }

    return { enabled: true, remindDays: 5 };
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(enabled: boolean, remindInDays: number): Promise<void> {
    await this.init();
    this.ensureInitialized();

    // Validate input
    if (remindInDays < 1 || remindInDays > 365) {
      throw new ValidationError('Remind in days must be between 1 and 365');
    }

    await this.db!.runAsync(
      'UPDATE notification_settings SET enabled = ?, remind_in_days = ? WHERE id = 1',
      [enabled ? 1 : 0, remindInDays]
    );
  }

  // ==================== Notification Schedule ====================

  async getNotificationSchedules(): Promise<
    {
      reagent_id: number;
      notification_id: string;
      scheduled_for: string;
      expiry_date: string;
      remind_days: number;
    }[]
  > {
    await this.init();
    this.ensureInitialized();

    return this.db!.getAllAsync<{
      reagent_id: number;
      notification_id: string;
      scheduled_for: string;
      expiry_date: string;
      remind_days: number;
    }>(
      'SELECT reagent_id, notification_id, scheduled_for, expiry_date, remind_days FROM notification_schedule'
    );
  }

  async upsertNotificationSchedule(
    reagentId: number,
    notificationId: string,
    scheduledFor: string,
    expiryDate: string,
    remindDays: number
  ): Promise<void> {
    await this.init();
    this.ensureInitialized();

    const now = new Date().toISOString();

    await this.db!.runAsync(
      `INSERT OR REPLACE INTO notification_schedule
       (reagent_id, notification_id, scheduled_for, expiry_date, remind_days, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [reagentId, notificationId, scheduledFor, expiryDate, remindDays, now]
    );
  }

  async deleteNotificationSchedule(reagentId: number): Promise<void> {
    await this.init();
    this.ensureInitialized();

    await this.db!.runAsync('DELETE FROM notification_schedule WHERE reagent_id = ?', [
      reagentId,
    ]);
  }

  async clearNotificationSchedules(): Promise<void> {
    await this.init();
    this.ensureInitialized();

    await this.db!.runAsync('DELETE FROM notification_schedule');
  }
}

// Export singleton instance
const databaseService = new DatabaseService();
export default databaseService;

// Also export the class for testing
export { DatabaseService, ValidationError };
