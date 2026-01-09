import * as SQLite from 'expo-sqlite';
import type { Reagent, GeneralNote } from '@expiry-alert/shared';

const DB_NAME = 'reagents.db';

class DatabaseService {
  private db: SQLite.WebSQLDatabase | null = null;

  async init() {
    this.db = SQLite.openDatabase(DB_NAME);
    await this.createTables();
  }

  private createTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction(
        (tx) => {
          // Reagents table
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS reagents (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              category TEXT NOT NULL,
              expiry_date TEXT NOT NULL,
              lot_number TEXT,
              received_date TEXT,
              notes TEXT,
              is_archived INTEGER DEFAULT 0,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );`
          );

          // General notes table
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS general_notes (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              content TEXT NOT NULL,
              created_at TEXT NOT NULL
            );`
          );
        },
        (error) => reject(error),
        () => resolve()
      );
    });
  }

  // Get active reagents
  async getActiveReagents(): Promise<Reagent[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction((tx) => {
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

  // Add reagent
  async addReagent(
    name: string,
    category: string,
    expiryDate: string,
    lotNumber?: string,
    receivedDate?: string,
    notes?: string
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const now = new Date().toISOString();

      this.db.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO reagents (name, category, expiry_date, lot_number, received_date, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [name, category, expiryDate, lotNumber || null, receivedDate || null, notes || null, now, now],
          (_, result) => {
            resolve(result.insertId!);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Archive reagent
  async archiveReagent(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const now = new Date().toISOString();

      this.db.transaction((tx) => {
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

  // Delete reagent
  async deleteReagent(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction((tx) => {
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

  // Get general notes
  async getGeneralNotes(): Promise<GeneralNote[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction((tx) => {
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

  // Add general note
  async addGeneralNote(content: string): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const now = new Date().toISOString();

      this.db.transaction((tx) => {
        tx.executeSql(
          'INSERT INTO general_notes (content, created_at) VALUES (?, ?)',
          [content, now],
          (_, result) => {
            resolve(result.insertId!);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }
}

export default new DatabaseService();
