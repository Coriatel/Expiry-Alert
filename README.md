# Reagent Expiry Tracker | מעקב תפוגת ריאגנטים

A desktop application for tracking reagent expiration dates in blood banks and medical laboratories.

**אפליקציית דסקטופ לניהול ומעקב תפוגת ריאגנטים בבנקי דם ומעבדות רפואיות.**

---

## ✨ Features | תכונות

- 🔬 **Reagent Management** - Track reagents and beads with expiry dates
- 📅 **Smart Expiry Alerts** - Visual color coding (red/orange/yellow) for expiring items
- 🔔 **In-App Notifications** - Customizable reminders for expiring reagents
- 📝 **General Notes** - Shift notes for team communication
- 🗄️ **Archive System** - Organize expired/completed items
- 🌐 **Bilingual** - Full support for Hebrew (RTL) and English
- 💾 **100% Local** - All data stored locally, no internet required
- 🚀 **Fast & Lightweight** - Built with Tauri (5-15MB installer)

---

## 📋 Requirements | דרישות מערכת

### For Development | לפיתוח
- **Node.js** 20.x or higher
- **Rust** 1.70 or higher (for Tauri)
- **pnpm** (recommended) or npm
- **WebView2** (Windows, usually pre-installed on Windows 11)

### For Running the App | להרצת האפליקציה
- Windows 11 (recommended) or Windows 10
- WebView2 Runtime (auto-installed if missing)

---

## 🚀 Quick Start | התחלה מהירה

### 1. Install Prerequisites | התקנת דרישות

#### Install Rust | התקנת Rust
```bash
# Windows (PowerShell)
# Visit: https://rustup.rs/
# Download and run rustup-init.exe
```

#### Install Node.js | התקנת Node.js
```bash
# Download from: https://nodejs.org/
# Version 20 LTS recommended
```

#### Install pnpm (optional) | התקנת pnpm
```bash
npm install -g pnpm
```

---

### 2. Clone and Install | שכפול והתקנה

```bash
# Clone the repository
git clone <your-repo-url>
cd Expiry-Alert

# Install dependencies
npm install
# or
pnpm install
```

---

### 3. Run Development Mode | הרצה במצב פיתוח

```bash
npm run tauri:dev
# or
pnpm tauri:dev
```

The app will open automatically. Hot reload is enabled for frontend changes.

**האפליקציה תיפתח אוטומטית. שינויים בקוד יעודכנו באופן אוטומטי.**

---

### 4. Build for Production | בניית גרסת הפקה

```bash
npm run tauri:build
# or
pnpm tauri:build
```

The installer will be created in:
```
src-tauri/target/release/bundle/
```

**קובץ ההתקנה יימצא בתיקייה המצוינת למעלה.**

Look for:
- **Windows**: `.msi` installer in `msi/` folder
- **Portable**: `.exe` in `nsis/` folder (no installation required)

---

## 📁 Project Structure | מבנה הפרויקט

```
Expiry-Alert/
├── src/                      # React frontend
│   ├── components/           # UI components
│   │   ├── ui/              # Base components (Button, Input, etc.)
│   │   ├── ReagentTable.tsx
│   │   ├── BulkAddForm.tsx
│   │   ├── GeneralNotes.tsx
│   │   └── NotificationBanner.tsx
│   ├── pages/               # Page components
│   │   ├── Dashboard.tsx
│   │   └── Archive.tsx
│   ├── i18n/                # Translations (Hebrew/English)
│   ├── lib/                 # Utilities and Tauri API
│   ├── store/               # State management (Zustand)
│   ├── types/               # TypeScript types
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── main.rs          # Tauri commands
│   │   └── db.rs            # SQLite database logic
│   ├── Cargo.toml           # Rust dependencies
│   └── tauri.conf.json      # Tauri configuration
├── package.json
├── vite.config.ts
└── README.md
```

---

## 💾 Database Location | מיקום מסד הנתונים

The SQLite database is stored at:

**Windows:**
```
C:\Users\<YourUsername>\AppData\Local\reagent-expiry-tracker\reagents.db
```

**To backup your data:** Copy the `reagents.db` file to a safe location.

**לגיבוי הנתונים:** העתק את הקובץ `reagents.db` למיקום בטוח.

---

## 🎯 How to Use | איך להשתמש

### Adding Reagents | הוספת ריאגנטים

1. Click **"Add Multiple"** button (הוסף מספר ריאגנטים)
2. Fill in up to 4 reagents at once:
   - **Name** (required) - שם הריאגנט
   - **Category** (required) - כדוריות/ריאגנטים
   - **Expiry Date** (required) - תאריך תפוגה
   - **LOT Number** (optional) - מספר עוצבה
   - **Received Date** (optional) - תאריך קבלה
   - **Notes** (optional) - הערות
3. Click **"Save"** (שמור)

### Managing Reagents | ניהול ריאגנטים

- **Edit** (ערוך) - Click the pencil icon
- **Archive** (העבר לארכיון) - Click the archive icon
- **Delete** (מחק) - Click the trash icon
- **Bulk Actions** (פעולות קבוצתיות) - Select multiple items using checkboxes

### General Notes | הערות כלליות

- Add shift notes for team communication
- View history of all notes
- Delete old notes when no longer needed

### Notifications | התראות

When reagents are expiring soon (default: 5 days before), a notification banner appears with options:
- **Remind Tomorrow** (הזכר לי מחר)
- **Remind in 3 Days** (הזכר לי בעוד 3 ימים)
- **Don't Remind Again** (אל תזכיר לי יותר)

---

## ⚙️ Configuration | הגדרות

### Notification Settings | הגדרות התראות

Currently hardcoded in `db.rs`:
```rust
remind_in_days: 5  // Remind 5 days before expiry
```

To change this, edit `src-tauri/src/db.rs` and rebuild.

**לשינוי ימי ההתראה, ערוך את הקובץ ובנה מחדש.**

---

## 🐛 Troubleshooting | פתרון בעיות

### App won't start | האפליקציה לא נפתחת

1. Make sure WebView2 is installed:
   - Download from: https://developer.microsoft.com/microsoft-edge/webview2/
2. Check Windows Event Viewer for errors
3. Try running as Administrator

### Database errors | שגיאות במסד נתונים

1. Close the app completely
2. Backup the database file (see location above)
3. Delete `reagents.db` - it will be recreated on next launch
4. Restore your data from backup if needed

### Build errors | שגיאות בבנייה

```bash
# Clear cache and reinstall
rm -rf node_modules
rm -rf src-tauri/target
npm install
npm run tauri:build
```

---

## 🔒 Security | אבטחה

- **Local Only** - No data is sent to any server
- **No Authentication** - Single-user app, suitable for workstation use
- **Database** - SQLite file with no encryption (contains non-sensitive reagent data only)

**⚠️ Important:** This app is designed for tracking reagent inventory only. Do NOT store patient information or sensitive medical data.

**חשוב:** אפליקציה זו מיועדת למעקב מלאי ריאגנטים בלבד. אין לאחסן מידע על מטופלים או נתונים רפואיים רגישים.

---

## 🛠️ Development | פיתוח

### Available Scripts | סקריפטים זמינים

```bash
# Development mode with hot reload
npm run tauri:dev

# Build production installer
npm run tauri:build

# Run frontend only (for UI development)
npm run dev

# Type checking
npx tsc --noEmit

# Lint
npx eslint src/
```

### Adding Features | הוספת תכונות

1. **Frontend changes:** Edit files in `src/`
2. **Backend/Database:** Edit `src-tauri/src/db.rs`
3. **Tauri commands:** Edit `src-tauri/src/main.rs`
4. **Translations:** Edit `src/i18n/locales/he.json` and `en.json`

---

## 📦 Dependencies | תלויות

### Frontend
- React 18
- TanStack Table (table management)
- date-fns (date utilities)
- i18next (translations)
- Zustand (state management)
- TailwindCSS (styling)

### Backend
- Tauri 1.5
- rusqlite (SQLite database)
- serde (serialization)
- chrono (date handling)

---

## 📝 License | רישיון

[Specify your license here]

---

## 🤝 Contributing | תרומה

[Add contribution guidelines if open source]

---

## 📞 Support | תמיכה

For issues and questions:
- Open an issue on GitHub
- Contact: [your-email@example.com]

---

## 🗺️ Roadmap | תכנון עתידי

- [ ] Export to CSV/Excel
- [ ] Import from CSV
- [ ] Print reports
- [ ] Mobile companion app (React Native)
- [ ] Windows system notifications (optional)
- [ ] Auto-archive expired reagents after X days
- [ ] Barcode scanning support

---

**Made with ❤️ for Blood Banks and Medical Laboratories**

**נוצר באהבה עבור בנקי דם ומעבדות רפואיות**
