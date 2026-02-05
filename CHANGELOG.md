# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-09

### Added
- Initial release
- Desktop application for Windows using Tauri
- Reagent expiry tracking with color-coded alerts
- Bulk add functionality (add up to 4 reagents at once)
- General notes system for shift communication
- Archive system for expired reagents
- In-app notification system for expiring items
- Bilingual support (Hebrew RTL + English)
- Local SQLite database (no internet required)
- Multi-select for bulk operations (delete/archive)
- Sortable and draggable table columns
- Category support (Reagents/Beads)
- LOT number tracking
- Received date tracking (optional)
- Notes per reagent
- Snooze notifications (1 day or 3 days)
- Dismiss notifications permanently per item

### Features by Priority
- ✅ Core reagent tracking
- ✅ Expiry date management
- ✅ Visual alerts (red/orange/yellow)
- ✅ Archive system
- ✅ General notes
- ✅ Bulk operations
- ✅ Bilingual UI
- ✅ In-app notifications

### Technical Stack
- Frontend: React 18 + TypeScript + Vite + TailwindCSS
- Backend: Rust + Tauri 1.5
- Database: SQLite (rusqlite)
- State: Zustand
- Table: TanStack Table
- i18n: i18next

### Known Limitations
- No cloud sync (local-only by design)
- No multi-user on same database (each user has separate DB)
- No CSV export/import (planned for v1.1)
- No Windows system notifications (uses in-app notifications only)
- No barcode scanning (planned for future)

## [Unreleased]

### Planned for v1.1
- [ ] CSV export functionality
- [ ] CSV import with column mapping
- [ ] Print reports
- [ ] Auto-archive expired reagents after X days
- [ ] Customizable notification days
- [ ] Database backup/restore UI

### Planned for v2.0
- [ ] Mobile companion app (React Native)
- [ ] Optional network sync between workstations
- [ ] Barcode scanning support
- [ ] Windows system notifications (opt-in)
- [ ] Email notifications (opt-in)

---

[1.0.0]: https://github.com/yourusername/expiry-alert/releases/tag/v1.0.0
