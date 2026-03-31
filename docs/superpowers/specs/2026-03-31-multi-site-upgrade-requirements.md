# Expiry Alert v2 — Multi-Site + Inventory Upgrade — Requirements Document

**Date:** 2026-03-31
**Status:** Approved — All questions resolved

---

## 1. Overview

Major upgrade to Expiry Alert that adds multi-hospital support, supplier/reagent catalog,
quantity tracking, destruction workflow, and a redesigned navigation system.

**Target hospitals:** Beilinson (בילינסון), HaSharon (השרון) — both part of Rabin Medical Center.

---

## 2. Decisions Log

| Question | Decision |
|----------|----------|
| Categories | No complex category system. Simple: reagent name + supplier. Keep existing `category` field as-is for backward compat but not prominent in new UI. |
| Inactive suppliers | Do NOT import. Only seed active suppliers from Flow Control (12 suppliers). |
| Catalog scope | Per-team. Both teams start with the same full catalog, but each team can independently delete suppliers/reagents from their own catalog. |
| Supplier/reagent deletion | Allowed per-team. Deleting a supplier cascades to delete its reagents from that team's catalog. |
| Import between teams | Yes, bulk (multiple reagents at once). Copy only, not move. |
| Destruction: partial | Entire reagent moves to history. `quantity_destroyed` recorded separately. History page has a toggle to filter "destroyed only" for destruction reports. |
| Sidebar | Collapsed by default on desktop (icons only, expands on click). Mobile: hamburger → drawer overlay. |

---

## 3. Requirements

### REQ-01: Team Quick Toggle (Multi-Site)

**What:** Fast toggle between teams (hospitals) directly from the sidebar.

**Details:**
- Active team name displayed prominently in sidebar
- Toggle mechanism: dropdown/switcher at top of sidebar
- Switching reloads all data for the selected team
- Each team has independent: reagent inventory, batch history, duplication history, supplier/reagent catalog
- Messages and Settings may be shared or per-team (existing behavior)

**Prerequisite:** Create "השרון" (HaSharon) team in the system.

---

### REQ-02: Sidebar Navigation (Replaces Bottom Nav)

**What:** Replace bottom tab navigation with a collapsible side menu.

**Sidebar items (top to bottom):**
1. **Team selector** — current team name + toggle (בילינסון ⇄ השרון)
2. **לוח בקרה** (Dashboard) — main reagent view
3. **היסטוריית אצוות** (Batch History) — destroyed/expired items
4. **היסטוריית שכפולים** (Duplication History) — received shipments log
5. **הודעות** (Messages) — with unread count badge
6. **הגדרות** (Settings)

**Desktop:** Collapsed by default (icons only). Expands on hover/click. Stays expanded if user pins it.
**Mobile:** Hidden. Hamburger button opens as overlay drawer.

**Removed:** Archive page (replaced by היסטוריית אצוות). Bottom tab bar removed entirely.

---

### REQ-03: Supplier Catalog (Per-Team)

**What:** Predefined list of suppliers per team. Users select from list, no free-text.

**Seed data (12 active suppliers from Flow Control):**
ALMOG, RANIUM, DYN, ZOTAL, BIORAD, SARTORIUS, MEDTECHNICA, OTHER, SIGMA_ALDRICH, MEDIGAL, ELDAN, DANIEL_BIOTECH

**Per-team behavior:**
- Both teams start with the full catalog
- Each team can delete suppliers independently
- Deleting a supplier from a team also deletes all its reagents from that team's catalog
- Teams can add new suppliers to their own catalog

**Fields:** id, team_id, name, short_code, is_active, date_created

---

### REQ-04: Reagent Catalog (Per-Team)

**What:** Predefined list of reagent names, each linked to a supplier. Users select from list filtered by supplier.

**Seed data (55 reagents from Flow Control, mapped to suppliers):**
- BIORAD: 24 reagents
- ELDAN: 25 reagents
- ALMOG: 3 reagents
- DANIEL_BIOTECH: 2 reagents
- DYN: 1 reagent

**Selection flow:**
1. User selects supplier → dropdown shows only that supplier's reagents
2. User selects reagent from filtered list
3. Can add new reagent to catalog (must be linked to a supplier)

**Fields:** id, team_id, name, catalog_number (optional), supplier_id (FK), is_active, date_created

---

### REQ-05: Quantity (Units) Field

**What:** Track quantity (units/boxes) for each reagent.

**Details:**
- Field `quantity` already exists as nullable string → convert to integer, actively used
- Displayed in Dashboard table/cards
- Editable
- Used in destruction workflow (how many destroyed)
- Pre-filled during duplication with confirmation prompt

---

### REQ-06: Supplier Field on Reagent

**What:** Each active reagent record linked to its supplier.

**Details:**
- `supplier_id` (FK to team's supplier catalog)
- `supplier_name` (denormalized, for display and history snapshots)
- Auto-populated when selecting reagent from catalog
- Displayed as column in Dashboard table
- Included in all print outputs and history records

---

### REQ-07: Destruction / Disposal Workflow

**What:** Replace "Archive" action with destruction/disposal workflow.

**Trigger:** User clicks treatment/disposal icon on a reagent.

**Dialog:**
- Question text: **"המוצר פג תוקף. האם נשארו במלאי יחידות שיש להשמיד?"**
- Input field: number of units destroyed (pre-filled with current quantity)
- Button: **"לא הושמדו"** (None destroyed) → sets quantity_destroyed = 0
- Confirm button: saves and moves to history

**On confirm:**
- Entire reagent record moves from active dashboard to batch history
- Destruction log record created with:
  - destruction_date (auto: now)
  - quantity_destroyed (user input or 0)
  - quantity_original (from reagent)
  - All snapshot fields: reagent_name, supplier_name, lot_number, expiry_date
  - destroyed_by (current user ID)
- Reagent removed from active view (is_archived = true or deleted)

**Bulk:** Support bulk destruction for selected reagents (same dialog per reagent, or simplified bulk flow).

---

### REQ-08: Duplication Enhancement ("משלוח חדש" — New Shipment)

**What:** Rename and enhance existing duplication. System label: "משלוח חדש" (New Shipment).

**Dialog (pre-filled from original):**
- **שם ריאגנט** (Reagent name): locked, read-only
- **ספק** (Supplier): locked, read-only
- **מספר אצווה** (Lot number): **empty** — user must enter
- **תאריך תפוגה** (Expiry date): **empty** — user must enter
- **כמות** (Quantity): pre-filled from original

**Quantity confirmation indicator:**
- Below quantity field: text in **dark green** (logo color, ~#2d6a4f or similar) with **?** icon
- Text: **"האם זו אותה כמות?"** (Is this the same quantity?)
- Visual reminder only, not blocking
- User edits quantity if different, then saves

**On save:**
- New reagent created with entered data
- Original reagent gets "✓ הגיע חדש — [date]" appended to notes (existing behavior)
- Duplication log record created (REQ-10)

---

### REQ-09: Batch History Page ("היסטוריית אצוות")

**What:** New page replacing Archive. Shows all destroyed/disposed reagent batches.

**Columns:**
| Hebrew | English | Source |
|--------|---------|--------|
| תאריך השמדה | Destruction date | destruction_log.destruction_date |
| שם ריאגנט | Reagent name | destruction_log.reagent_name |
| ספק | Supplier | destruction_log.supplier_name |
| מספר אצווה | Lot number | destruction_log.lot_number |
| תאריך תפוגה | Expiry date | destruction_log.expiry_date |
| כמות מקורית | Original quantity | destruction_log.quantity_original |
| כמות שהושמדה | Quantity destroyed | destruction_log.quantity_destroyed |
| בוצע ע"י | Performed by | destruction_log.destroyed_by → user name |

**Toggle filter: "אצוות שהושמדו בלבד"** — when ON, shows only records where quantity_destroyed > 0. For generating destruction-specific reports.

**Period filters:**
- Quick: חודש אחרון | חודש קודם | 3 חודשים | חצי שנה | שנה אחרונה
- Custom: date range picker (from → to) with calendar UI
- Filters apply to destruction_date

**Sorting:** Clickable column headers, default by destruction_date descending.

**Print:**
- Prints current view with all active filters/sorting
- Print header:
  - Expiry Alert logo
  - "מערכת Expiry Alert"
  - Team name: "בילינסון" or "השרון"
  - Printed by: [user name]
  - Date/time of print
  - Active filter period shown
- "בוצע ע"י" column included in print output

---

### REQ-10: Duplication History Page ("היסטוריית שכפולים")

**What:** Log of all received shipments (duplications).

**Columns:**
| Hebrew | English | Source |
|--------|---------|--------|
| תאריך קבלה | Date received | duplication_log.received_date |
| שם ריאגנט | Reagent name | duplication_log.reagent_name |
| ספק | Supplier | duplication_log.supplier_name |
| מספר אצווה | Lot number | duplication_log.lot_number |
| תאריך תפוגה | Expiry date | duplication_log.expiry_date |
| כמות | Quantity | duplication_log.quantity |
| בוצע ע"י | Performed by | duplication_log.received_by → user name |

**Filters:** Same as REQ-09 (period selection + custom date range, applied to received_date).
**Sorting:** Same as REQ-09 (clickable columns, default by received_date desc).
**Print:** Same format as REQ-09.

---

### REQ-11: Import Reagents Between Teams

**What:** Copy reagent records from one team to another. Bulk supported.

**Flow:**
1. User viewing team A selects one or more reagents
2. Action button: **"ייבוא לצוות אחר"** (Import to other team) or **"העתק ל-[team name]"**
3. Confirmation dialog: "להעתיק X ריאגנטים ל-[team B]?"
4. On confirm: reagents copied to team B with all fields (name, supplier, lot, expiry, quantity)
5. Copies are independent — changes in one team don't affect the other

**Note:** This is copy only, not move. Original stays in source team.

---

### REQ-12: Alerts Include Hospital/Team Name

**What:** All expiry alerts clearly identify the hospital.

**Details:**
- Push notifications: "בילינסון: Anti-D פג תוקף!"
- In-app ExpiryAlertSection: team name shown per alert item
- Email alerts (future): team name in subject and body
- Print headers always include team name

---

## 4. Data Model Changes

### New Directus Collections

**`ea_suppliers`** (per-team catalog)
| Field | Type | Notes |
|-------|------|-------|
| id | auto-increment | PK |
| team | FK → teams | Required |
| name | string | Required |
| short_code | string(4) | Optional |
| is_active | boolean | Default true |
| date_created | datetime | Auto |

**`ea_reagent_catalog`** (per-team catalog)
| Field | Type | Notes |
|-------|------|-------|
| id | auto-increment | PK |
| team | FK → teams | Required |
| name | string | Required |
| catalog_number | string | Optional |
| supplier_id | FK → ea_suppliers | Required |
| is_active | boolean | Default true |
| date_created | datetime | Auto |

**`ea_destruction_log`** (per-team history)
| Field | Type | Notes |
|-------|------|-------|
| id | auto-increment | PK |
| team | FK → teams | Required |
| reagent_name | string | Snapshot |
| supplier_name | string | Snapshot |
| lot_number | string | Snapshot |
| expiry_date | date | Snapshot |
| quantity_original | integer | From reagent |
| quantity_destroyed | integer | User-entered (0 = none destroyed) |
| destroyed_by | FK → users | Current user |
| destruction_date | datetime | Auto |
| notes | text | Optional |

**`ea_duplication_log`** (per-team history)
| Field | Type | Notes |
|-------|------|-------|
| id | auto-increment | PK |
| team | FK → teams | Required |
| original_reagent_id | integer | Source reagent (nullable, may be deleted) |
| new_reagent_id | integer | Created reagent |
| reagent_name | string | Snapshot |
| supplier_name | string | Snapshot |
| lot_number | string | New lot number |
| expiry_date | date | New expiry |
| quantity | integer | Quantity received |
| received_by | FK → users | Current user |
| received_date | datetime | Auto |

### Modified Fields on Existing `reagents` Collection

| Field | Change |
|-------|--------|
| `quantity` | Already exists (nullable string) → actively use as integer |
| `supplier_id` | **NEW** — FK to ea_suppliers |
| `supplier_name` | **NEW** — denormalized string |
| `catalog_reagent_id` | **NEW** — FK to ea_reagent_catalog (optional) |

---

## 5. UI Structure (After)

### Sidebar (RTL)
```
┌──────────────────────────────┐
│  ▾ בילינסון                  │  ← team selector dropdown
├──────────────────────────────┤
│  📊  לוח בקרה               │
│  📋  היסטוריית אצוות         │
│  📦  היסטוריית שכפולים       │
│  💬  הודעות           (3)   │
│  ⚙️  הגדרות                 │
└──────────────────────────────┘
```

**Collapsed (default desktop):**
```
┌────┐
│ ▾B │  ← team initial
├────┤
│ 📊 │
│ 📋 │
│ 📦 │
│ 💬3│
│ ⚙️ │
└────┘
```

### Pages
1. **לוח בקרה (Dashboard)** — existing, enhanced with supplier column + quantity
2. **היסטוריית אצוות (Batch History)** — NEW, replaces Archive
3. **היסטוריית שכפולים (Duplication History)** — NEW
4. **הודעות (Messages)** — existing, moved from tab to sidebar
5. **הגדרות (Settings)** — existing, team management + catalog management

### Dashboard Enhancements
- Add supplier column to table
- Add quantity column to table
- Replace "archive" action with "destruction" action icon
- Replace "duplicate" label with "משלוח חדש"
- Import-to-team action on selected reagents

### Adding a New Reagent (Enhanced Flow)
1. Click "הוספת ריאגנטים" (existing button)
2. **Select supplier** from dropdown (from team's ea_suppliers)
3. **Select reagent** from dropdown (filtered by selected supplier, from team's ea_reagent_catalog)
4. Enter: lot number, expiry date, quantity
5. Save

---

## 6. Seed Data Summary

**Suppliers (12 active):**
ALMOG, BIORAD, DANIEL_BIOTECH, DYN, ELDAN, MEDTECHNICA, MEDIGAL, OTHER, RANIUM, SARTORIUS, SIGMA_ALDRICH, ZOTAL

**Reagents (55 total):**
- BIORAD: Anti IgG, Liss/Coombs, ABO/D+Reverse Group, ABD-Confirmation, DC screening I, DC screening II, ID Anti-IgG1/IgG3, Anti Fya Serum, DIACELL I-II-III, DIACELL ABO (A1-B), DIAPANEL, DIAPANEL P, Diluent II for IH-1000, Diluent II 500ml, DECON 90, DTT 0.2M, EQAS A/B/C, IH-QC 1, IH-QC 2, PIPETTE RED, PIPETTE BLACK, TIPS
- ELDAN: Anti-A, Anti-B, Anti-D, Anti-IgG Green, Anti-A1, Anti-C, Anti-c, Anti-E, Anti-e, Anti-K, Anti-k, Anti-M, Anti-N, Anti-P1, Anti-Fya, Anti-Fyb, Anti-Jkb, Ficin, Elu-kit II, CORQC TEST SYSTEM, CHECKCELLS, PANOCELL 10, PANOSCREEN I-II-III, REFERENCELLS A1-B, REFERENCELLS A2
- ALMOG: Anti-s, Anti-S, Anti-Jka
- DANIEL_BIOTECH: Anti-K Danyel, Anti-Jkb Danyel
- DYN: NaOH
