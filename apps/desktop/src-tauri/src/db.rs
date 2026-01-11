use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use chrono::{Utc, Duration};

/// Database schema version for future migrations
const DB_VERSION: i32 = 1;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Reagent {
    pub id: i64,
    pub name: String,
    pub category: String,
    pub expiry_date: String,
    pub lot_number: Option<String>,
    pub received_date: Option<String>,
    pub notes: Option<String>,
    pub is_archived: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GeneralNote {
    pub id: i64,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NotificationSettings {
    pub id: i64,
    pub enabled: bool,
    pub remind_in_days: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NotificationSnooze {
    pub reagent_id: i64,
    pub snoozed_until: String,
    pub dismissed: bool,
}

/// Input data for creating/updating a reagent
#[derive(Debug, Deserialize)]
pub struct ReagentInput {
    pub name: String,
    pub category: String,
    pub expiry_date: String,
    pub lot_number: Option<String>,
    pub received_date: Option<String>,
    pub notes: Option<String>,
}

impl ReagentInput {
    /// Validate the input data
    pub fn validate(&self) -> Result<(), String> {
        if self.name.trim().is_empty() {
            return Err("Name cannot be empty".to_string());
        }
        if self.name.len() > 255 {
            return Err("Name too long (max 255 characters)".to_string());
        }
        if self.category != "reagents" && self.category != "beads" {
            return Err("Invalid category (must be 'reagents' or 'beads')".to_string());
        }
        if self.expiry_date.trim().is_empty() {
            return Err("Expiry date cannot be empty".to_string());
        }
        // Validate date format (YYYY-MM-DD)
        if !Self::is_valid_date(&self.expiry_date) {
            return Err("Invalid expiry date format (expected YYYY-MM-DD)".to_string());
        }
        if let Some(ref received) = self.received_date {
            if !received.is_empty() && !Self::is_valid_date(received) {
                return Err("Invalid received date format (expected YYYY-MM-DD)".to_string());
            }
        }
        Ok(())
    }

    fn is_valid_date(date: &str) -> bool {
        chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d").is_ok()
    }
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new() -> Result<Self> {
        let db_path = Self::get_db_path()?;

        // Create parent directory if it doesn't exist
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| rusqlite::Error::InvalidPath(db_path.clone()))?;
        }

        let conn = Connection::open(&db_path)?;

        // Enable foreign keys and WAL mode for better performance
        conn.execute_batch("
            PRAGMA foreign_keys = ON;
            PRAGMA journal_mode = WAL;
            PRAGMA busy_timeout = 5000;
        ")?;

        let db = Database { conn };
        db.run_migrations()?;

        Ok(db)
    }

    /// Run database migrations
    fn run_migrations(&self) -> Result<()> {
        // Create version table if not exists
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS db_version (
                version INTEGER PRIMARY KEY
            )",
            [],
        )?;

        let current_version: i32 = self.conn
            .query_row("SELECT COALESCE(MAX(version), 0) FROM db_version", [], |row| row.get(0))
            .unwrap_or(0);

        // Run migrations based on version
        if current_version < 1 {
            self.migrate_v1()?;
        }

        Ok(())
    }

    /// Migration to version 1 - initial schema
    fn migrate_v1(&self) -> Result<()> {
        self.conn.execute_batch("
            CREATE TABLE IF NOT EXISTS reagents (
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
            );

            CREATE INDEX IF NOT EXISTS idx_reagents_expiry ON reagents(expiry_date);
            CREATE INDEX IF NOT EXISTS idx_reagents_archived ON reagents(is_archived);
            CREATE INDEX IF NOT EXISTS idx_reagents_category ON reagents(category);

            CREATE TABLE IF NOT EXISTS general_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS notification_settings (
                id INTEGER PRIMARY KEY,
                enabled INTEGER DEFAULT 1 CHECK(enabled IN (0, 1)),
                remind_in_days INTEGER DEFAULT 5 CHECK(remind_in_days >= 1 AND remind_in_days <= 365)
            );

            CREATE TABLE IF NOT EXISTS notification_snoozes (
                reagent_id INTEGER PRIMARY KEY,
                snoozed_until TEXT,
                dismissed INTEGER DEFAULT 0 CHECK(dismissed IN (0, 1)),
                FOREIGN KEY (reagent_id) REFERENCES reagents(id) ON DELETE CASCADE
            );

            INSERT OR IGNORE INTO notification_settings (id, enabled, remind_in_days) VALUES (1, 1, 5);
            INSERT OR REPLACE INTO db_version (version) VALUES (1);
        ")?;

        Ok(())
    }

    fn get_db_path() -> Result<PathBuf> {
        let base_dirs = directories::BaseDirs::new()
            .ok_or_else(|| rusqlite::Error::InvalidQuery)?;

        let mut path = base_dirs.data_local_dir().to_path_buf();
        path.push("reagent-expiry-tracker");
        path.push("reagents.db");
        Ok(path)
    }

    // Reagent operations
    pub fn get_all_reagents(&self) -> Result<Vec<Reagent>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, category, expiry_date, lot_number, received_date, notes, is_archived, created_at, updated_at
             FROM reagents
             ORDER BY expiry_date ASC"
        )?;

        let reagents = stmt.query_map([], |row| {
            Ok(Reagent {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                expiry_date: row.get(3)?,
                lot_number: row.get(4)?,
                received_date: row.get(5)?,
                notes: row.get(6)?,
                is_archived: row.get::<_, i32>(7)? == 1,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?;

        reagents.collect()
    }

    pub fn get_active_reagents(&self) -> Result<Vec<Reagent>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, category, expiry_date, lot_number, received_date, notes, is_archived, created_at, updated_at
             FROM reagents
             WHERE is_archived = 0
             ORDER BY expiry_date ASC"
        )?;

        let reagents = stmt.query_map([], |row| {
            Ok(Reagent {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                expiry_date: row.get(3)?,
                lot_number: row.get(4)?,
                received_date: row.get(5)?,
                notes: row.get(6)?,
                is_archived: row.get::<_, i32>(7)? == 1,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?;

        reagents.collect()
    }

    pub fn get_archived_reagents(&self) -> Result<Vec<Reagent>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, category, expiry_date, lot_number, received_date, notes, is_archived, created_at, updated_at
             FROM reagents
             WHERE is_archived = 1
             ORDER BY expiry_date DESC"
        )?;

        let reagents = stmt.query_map([], |row| {
            Ok(Reagent {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                expiry_date: row.get(3)?,
                lot_number: row.get(4)?,
                received_date: row.get(5)?,
                notes: row.get(6)?,
                is_archived: row.get::<_, i32>(7)? == 1,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?;

        reagents.collect()
    }

    pub fn add_reagent(
        &self,
        name: String,
        category: String,
        expiry_date: String,
        lot_number: Option<String>,
        received_date: Option<String>,
        notes: Option<String>,
    ) -> Result<i64> {
        // Validate input
        let input = ReagentInput {
            name: name.clone(),
            category: category.clone(),
            expiry_date: expiry_date.clone(),
            lot_number: lot_number.clone(),
            received_date: received_date.clone(),
            notes: notes.clone(),
        };
        input.validate().map_err(|e| rusqlite::Error::InvalidParameterName(e))?;

        let now = Utc::now().to_rfc3339();

        self.conn.execute(
            "INSERT INTO reagents (name, category, expiry_date, lot_number, received_date, notes, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![name.trim(), category, expiry_date, lot_number, received_date, notes, now, now],
        )?;

        Ok(self.conn.last_insert_rowid())
    }

    /// Add multiple reagents in a single transaction (atomic operation)
    pub fn add_reagents_bulk(&self, reagents: Vec<ReagentInput>) -> Result<Vec<i64>> {
        if reagents.is_empty() {
            return Ok(Vec::new());
        }

        // Validate all inputs first
        for (i, reagent) in reagents.iter().enumerate() {
            reagent.validate().map_err(|e| {
                rusqlite::Error::InvalidParameterName(format!("Reagent {}: {}", i + 1, e))
            })?;
        }

        let now = Utc::now().to_rfc3339();
        let mut ids = Vec::with_capacity(reagents.len());

        // Use a transaction for atomicity
        let tx = self.conn.unchecked_transaction()?;

        {
            let mut stmt = tx.prepare(
                "INSERT INTO reagents (name, category, expiry_date, lot_number, received_date, notes, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
            )?;

            for reagent in reagents {
                stmt.execute(params![
                    reagent.name.trim(),
                    reagent.category,
                    reagent.expiry_date,
                    reagent.lot_number,
                    reagent.received_date,
                    reagent.notes,
                    now,
                    now
                ])?;
                ids.push(tx.last_insert_rowid());
            }
        }

        tx.commit()?;
        Ok(ids)
    }

    /// Delete multiple reagents in a single transaction
    pub fn delete_reagents_bulk(&self, ids: &[i64]) -> Result<()> {
        if ids.is_empty() {
            return Ok(());
        }

        let tx = self.conn.unchecked_transaction()?;

        {
            let mut stmt = tx.prepare("DELETE FROM reagents WHERE id = ?1")?;
            for id in ids {
                stmt.execute(params![id])?;
            }
        }

        tx.commit()?;
        Ok(())
    }

    /// Archive multiple reagents in a single transaction
    pub fn archive_reagents_bulk(&self, ids: &[i64]) -> Result<()> {
        if ids.is_empty() {
            return Ok(());
        }

        let now = Utc::now().to_rfc3339();
        let tx = self.conn.unchecked_transaction()?;

        {
            let mut stmt = tx.prepare("UPDATE reagents SET is_archived = 1, updated_at = ?1 WHERE id = ?2")?;
            for id in ids {
                stmt.execute(params![now, id])?;
            }
        }

        tx.commit()?;
        Ok(())
    }

    pub fn update_reagent(
        &self,
        id: i64,
        name: String,
        category: String,
        expiry_date: String,
        lot_number: Option<String>,
        received_date: Option<String>,
        notes: Option<String>,
    ) -> Result<()> {
        let now = Utc::now().to_rfc3339();

        self.conn.execute(
            "UPDATE reagents
             SET name = ?1, category = ?2, expiry_date = ?3, lot_number = ?4, received_date = ?5, notes = ?6, updated_at = ?7
             WHERE id = ?8",
            params![name, category, expiry_date, lot_number, received_date, notes, now, id],
        )?;

        Ok(())
    }

    pub fn delete_reagent(&self, id: i64) -> Result<()> {
        self.conn.execute("DELETE FROM reagents WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn archive_reagent(&self, id: i64) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE reagents SET is_archived = 1, updated_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;
        Ok(())
    }

    pub fn restore_reagent(&self, id: i64) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE reagents SET is_archived = 0, updated_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;
        Ok(())
    }

    // General notes operations
    pub fn get_general_notes(&self) -> Result<Vec<GeneralNote>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, content, created_at FROM general_notes ORDER BY created_at DESC"
        )?;

        let notes = stmt.query_map([], |row| {
            Ok(GeneralNote {
                id: row.get(0)?,
                content: row.get(1)?,
                created_at: row.get(2)?,
            })
        })?;

        notes.collect()
    }

    pub fn add_general_note(&self, content: String) -> Result<i64> {
        let now = Utc::now().to_rfc3339();

        self.conn.execute(
            "INSERT INTO general_notes (content, created_at) VALUES (?1, ?2)",
            params![content, now],
        )?;

        Ok(self.conn.last_insert_rowid())
    }

    pub fn delete_general_note(&self, id: i64) -> Result<()> {
        self.conn.execute("DELETE FROM general_notes WHERE id = ?1", params![id])?;
        Ok(())
    }

    // Notification settings
    pub fn get_notification_settings(&self) -> Result<NotificationSettings> {
        let mut stmt = self.conn.prepare(
            "SELECT id, enabled, remind_in_days FROM notification_settings WHERE id = 1"
        )?;

        let settings = stmt.query_row([], |row| {
            Ok(NotificationSettings {
                id: row.get(0)?,
                enabled: row.get::<_, i32>(1)? == 1,
                remind_in_days: row.get(2)?,
            })
        })?;

        Ok(settings)
    }

    pub fn update_notification_settings(&self, enabled: bool, remind_in_days: i32) -> Result<()> {
        self.conn.execute(
            "UPDATE notification_settings SET enabled = ?1, remind_in_days = ?2 WHERE id = 1",
            params![if enabled { 1 } else { 0 }, remind_in_days],
        )?;
        Ok(())
    }

    pub fn snooze_notification(&self, reagent_id: i64, days: i32) -> Result<()> {
        // Validate days range
        if days < 1 || days > 365 {
            return Err(rusqlite::Error::InvalidParameterName("days must be between 1 and 365".to_string()));
        }

        let snoozed_until = Utc::now()
            .checked_add_signed(Duration::days(days as i64))
            .ok_or_else(|| rusqlite::Error::InvalidParameterName("Invalid date calculation".to_string()))?
            .to_rfc3339();

        self.conn.execute(
            "INSERT OR REPLACE INTO notification_snoozes (reagent_id, snoozed_until, dismissed)
             VALUES (?1, ?2, 0)",
            params![reagent_id, snoozed_until],
        )?;

        Ok(())
    }

    pub fn dismiss_notification(&self, reagent_id: i64) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO notification_snoozes (reagent_id, dismissed)
             VALUES (?1, 1)",
            params![reagent_id],
        )?;

        Ok(())
    }

    pub fn get_expiring_reagents(&self) -> Result<Vec<Reagent>> {
        let settings = self.get_notification_settings()?;

        if !settings.enabled {
            return Ok(Vec::new());
        }

        let today = Utc::now().date_naive();
        let threshold_date = today
            .checked_add_signed(Duration::days(settings.remind_in_days as i64))
            .unwrap_or(today); // Fallback to today if calculation fails
        let threshold_str = threshold_date.format("%Y-%m-%d").to_string();

        let mut stmt = self.conn.prepare(
            "SELECT r.id, r.name, r.category, r.expiry_date, r.lot_number, r.received_date, r.notes, r.is_archived, r.created_at, r.updated_at
             FROM reagents r
             LEFT JOIN notification_snoozes ns ON r.id = ns.reagent_id
             WHERE r.is_archived = 0
               AND r.expiry_date <= ?1
               AND (ns.dismissed IS NULL OR ns.dismissed = 0)
               AND (ns.snoozed_until IS NULL OR ns.snoozed_until < datetime('now'))
             ORDER BY r.expiry_date ASC"
        )?;

        let reagents = stmt.query_map([threshold_str], |row| {
            Ok(Reagent {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                expiry_date: row.get(3)?,
                lot_number: row.get(4)?,
                received_date: row.get(5)?,
                notes: row.get(6)?,
                is_archived: row.get::<_, i32>(7)? == 1,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?;

        reagents.collect()
    }
}
