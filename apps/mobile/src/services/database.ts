import * as SQLite from 'expo-sqlite';
import type { Reagent, GeneralNote } from '@expiry-alert/shared';

const DB_NAME = 'reagents.db';
const DB_VERSION = 1;

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
  private db: SQLite.WebSQLDatabase | null = null;
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
    this.db = SQLite.openDatabase(DB_NAME);
    await this.runMigrations();
  }

  /**
   * Run database migrations
   */
  private runMigrations(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction(
        (tx) => {
          // Create version table
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS db_version (
              version INTEGER PRIMARY KEY
            );`
          );

          // Check current version
          tx.executeSql(
            'SELECT COALESCE(MAX(version), 0) as version FROM db_version',
            [],
            (_, { rows }) => {
              const currentVersion = rows.item(0).version;

              if (currentVersion < 1) {
                this.migrateV1(tx);
              }
            }
          );
        },
        (error) => reject(error),
        () => resolve()
      );
    });
  }

  /**
   * Migration to version 1 - initial schema
   */
  private migrateV1(tx: SQLite.SQLTransaction): void {
    // Reagents table with constraints
    tx.executeSql(
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

    // Indexes for better query performance
    tx.executeSql(
      'CREATE INDEX IF NOT EXISTS idx_reagents_expiry ON reagents(expiry_date);'
    );
    tx.executeSql(
      'CREATE INDEX IF NOT EXISTS idx_reagents_archived ON reagents(is_archived);'
    );

    // General notes table
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS general_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      );`
    );

    // Notification settings table
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS notification_settings (
        id INTEGER PRIMARY KEY,
        enabled INTEGER DEFAULT 1 CHECK(enabled IN (0, 1)),
        remind_in_days INTEGER DEFAULT 5 CHECK(remind_in_days >= 1 AND remind_in_days <= 365)
      );`
    );

    // Insert default settings
    tx.executeSql(
      'INSERT OR IGNORE INTO notification_settings (id, enabled, remind_in_days) VALUES (1, 1, 5);'
    );

    // Update version
    tx.executeSql(
      'INSERT OR REPLACE INTO db_version (version) VALUES (?);',
      [DB_VERSION]
    );
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

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM reagents WHERE is_archived = 0 ORDER BY expiry_date ASC',
          [],
          (_, { rows }) => {
            const reagents: Reagent[] = [];
            for (let i = 0; i < rows.length; i++) {
              const row = rows.item(i);
              reagents.push({
                ...row,
                is_archived: row.is_archived === 1,
              });
            }
            resolve(reagents);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Get archived reagents
   */
  async getArchivedReagents(): Promise<Reagent[]> {
    await this.init();
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM reagents WHERE is_archived = 1 ORDER BY updated_at DESC',
          [],
          (_, { rows }) => {
            const reagents: Reagent[] = [];
            for (let i = 0; i < rows.length; i++) {
              const row = rows.item(i);
              reagents.push({
                ...row,
                is_archived: row.is_archived === 1,
              });
            }
            resolve(reagents);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
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

    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();

      this.db!.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO reagents (name, category, expiry_date, lot_number, received_date, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [name.trim(), category, expiryDate, lotNumber || null, receivedDate || null, notes || null, now, now],
          (_, result) => {
            if (result.insertId !== undefined && result.insertId !== null) {
              resolve(result.insertId);
            } else {
              reject(new Error('Failed to get insert ID'));
            }
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
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

    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();

      this.db!.transaction((tx) => {
        tx.executeSql(
          `UPDATE reagents
           SET name = ?, category = ?, expiry_date = ?, lot_number = ?, received_date = ?, notes = ?, updated_at = ?
           WHERE id = ?`,
          [name.trim(), category, expiryDate, lotNumber || null, receivedDate || null, notes || null, now, id],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Archive a reagent
   */
  async archiveReagent(id: number): Promise<void> {
    await this.init();
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();

      this.db!.transaction((tx) => {
        tx.executeSql(
          'UPDATE reagents SET is_archived = 1, updated_at = ? WHERE id = ?',
          [now, id],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Restore an archived reagent
   */
  async restoreReagent(id: number): Promise<void> {
    await this.init();
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();

      this.db!.transaction((tx) => {
        tx.executeSql(
          'UPDATE reagents SET is_archived = 0, updated_at = ? WHERE id = ?',
          [now, id],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Delete a reagent permanently
   */
  async deleteReagent(id: number): Promise<void> {
    await this.init();
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'DELETE FROM reagents WHERE id = ?',
          [id],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // ==================== General Notes Operations ====================

  /**
   * Get all general notes
   */
  async getGeneralNotes(): Promise<GeneralNote[]> {
    await this.init();
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM general_notes ORDER BY created_at DESC',
          [],
          (_, { rows }) => {
            const notes: GeneralNote[] = [];
            for (let i = 0; i < rows.length; i++) {
              notes.push(rows.item(i));
            }
            resolve(notes);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
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

    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();

      this.db!.transaction((tx) => {
        tx.executeSql(
          'INSERT INTO general_notes (content, created_at) VALUES (?, ?)',
          [trimmedContent, now],
          (_, result) => {
            if (result.insertId !== undefined && result.insertId !== null) {
              resolve(result.insertId);
            } else {
              reject(new Error('Failed to get insert ID'));
            }
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Delete a general note
   */
  async deleteGeneralNote(id: number): Promise<void> {
    await this.init();
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'DELETE FROM general_notes WHERE id = ?',
          [id],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // ==================== Notification Settings ====================

  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<{ enabled: boolean; remind_in_days: number }> {
    await this.init();
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'SELECT enabled, remind_in_days FROM notification_settings WHERE id = 1',
          [],
          (_, { rows }) => {
            if (rows.length > 0) {
              const row = rows.item(0);
              resolve({
                enabled: row.enabled === 1,
                remind_in_days: row.remind_in_days,
              });
            } else {
              resolve({ enabled: true, remind_in_days: 5 });
            }
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
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

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'UPDATE notification_settings SET enabled = ?, remind_in_days = ? WHERE id = 1',
          [enabled ? 1 : 0, remindInDays],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }
}

// Export singleton instance
const databaseService = new DatabaseService();
export default databaseService;

// Also export the class for testing
export { DatabaseService, ValidationError };
