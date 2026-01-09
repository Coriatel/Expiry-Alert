// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

use tauri::Manager;
use db::{Database, Reagent, GeneralNote, NotificationSettings};
use std::sync::Mutex;

struct AppState {
    db: Mutex<Database>,
}

#[tauri::command]
fn get_all_reagents(state: tauri::State<AppState>) -> Result<Vec<Reagent>, String> {
    state.db.lock().unwrap()
        .get_all_reagents()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_active_reagents(state: tauri::State<AppState>) -> Result<Vec<Reagent>, String> {
    state.db.lock().unwrap()
        .get_active_reagents()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_archived_reagents(state: tauri::State<AppState>) -> Result<Vec<Reagent>, String> {
    state.db.lock().unwrap()
        .get_archived_reagents()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn add_reagent(
    state: tauri::State<AppState>,
    name: String,
    category: String,
    expiry_date: String,
    lot_number: Option<String>,
    received_date: Option<String>,
    notes: Option<String>,
) -> Result<i64, String> {
    state.db.lock().unwrap()
        .add_reagent(name, category, expiry_date, lot_number, received_date, notes)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn add_reagents_bulk(
    state: tauri::State<AppState>,
    reagents: Vec<serde_json::Value>,
) -> Result<Vec<i64>, String> {
    let db = state.db.lock().unwrap();
    let mut ids = Vec::new();

    for reagent in reagents {
        let name = reagent["name"].as_str().unwrap_or("").to_string();
        let category = reagent["category"].as_str().unwrap_or("").to_string();
        let expiry_date = reagent["expiryDate"].as_str().unwrap_or("").to_string();
        let lot_number = reagent["lotNumber"].as_str().map(|s| s.to_string());
        let received_date = reagent["receivedDate"].as_str().map(|s| s.to_string());
        let notes = reagent["notes"].as_str().map(|s| s.to_string());

        if !name.is_empty() && !expiry_date.is_empty() {
            let id = db.add_reagent(name, category, expiry_date, lot_number, received_date, notes)
                .map_err(|e| e.to_string())?;
            ids.push(id);
        }
    }

    Ok(ids)
}

#[tauri::command]
fn update_reagent(
    state: tauri::State<AppState>,
    id: i64,
    name: String,
    category: String,
    expiry_date: String,
    lot_number: Option<String>,
    received_date: Option<String>,
    notes: Option<String>,
) -> Result<(), String> {
    state.db.lock().unwrap()
        .update_reagent(id, name, category, expiry_date, lot_number, received_date, notes)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_reagent(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    state.db.lock().unwrap()
        .delete_reagent(id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_reagents_bulk(state: tauri::State<AppState>, ids: Vec<i64>) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    for id in ids {
        db.delete_reagent(id).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn archive_reagent(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    state.db.lock().unwrap()
        .archive_reagent(id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn archive_reagents_bulk(state: tauri::State<AppState>, ids: Vec<i64>) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    for id in ids {
        db.archive_reagent(id).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn restore_reagent(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    state.db.lock().unwrap()
        .restore_reagent(id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_general_notes(state: tauri::State<AppState>) -> Result<Vec<GeneralNote>, String> {
    state.db.lock().unwrap()
        .get_general_notes()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn add_general_note(state: tauri::State<AppState>, content: String) -> Result<i64, String> {
    state.db.lock().unwrap()
        .add_general_note(content)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_general_note(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    state.db.lock().unwrap()
        .delete_general_note(id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_notification_settings(state: tauri::State<AppState>) -> Result<NotificationSettings, String> {
    state.db.lock().unwrap()
        .get_notification_settings()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_notification_settings(
    state: tauri::State<AppState>,
    enabled: bool,
    remind_in_days: i32,
) -> Result<(), String> {
    state.db.lock().unwrap()
        .update_notification_settings(enabled, remind_in_days)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn snooze_notification(
    state: tauri::State<AppState>,
    reagent_id: i64,
    days: i32,
) -> Result<(), String> {
    state.db.lock().unwrap()
        .snooze_notification(reagent_id, days)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn dismiss_notification(state: tauri::State<AppState>, reagent_id: i64) -> Result<(), String> {
    state.db.lock().unwrap()
        .dismiss_notification(reagent_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_expiring_reagents(state: tauri::State<AppState>) -> Result<Vec<Reagent>, String> {
    state.db.lock().unwrap()
        .get_expiring_reagents()
        .map_err(|e| e.to_string())
}

fn main() {
    let db = Database::new().expect("Failed to initialize database");

    tauri::Builder::default()
        .manage(AppState {
            db: Mutex::new(db),
        })
        .invoke_handler(tauri::generate_handler![
            get_all_reagents,
            get_active_reagents,
            get_archived_reagents,
            add_reagent,
            add_reagents_bulk,
            update_reagent,
            delete_reagent,
            delete_reagents_bulk,
            archive_reagent,
            archive_reagents_bulk,
            restore_reagent,
            get_general_notes,
            add_general_note,
            delete_general_note,
            get_notification_settings,
            update_notification_settings,
            snooze_notification,
            dismiss_notification,
            get_expiring_reagents,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
