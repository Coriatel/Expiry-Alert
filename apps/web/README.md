# Expiry Alert - Desktop App

Tauri desktop application for tracking reagent expiration.

## 🚀 Quick Start

```bash
# From project root:
npm run tauri:dev

# Or from this directory:
npm run tauri:dev
```

## 🏗️ Project Structure

```
apps/desktop/
├── src/                  # React frontend
│   ├── components/       # UI components
│   ├── pages/            # Main pages
│   ├── lib/              # Utilities
│   ├── i18n/             # Translations
│   └── store/            # State management
├── src-tauri/            # Rust backend
│   └── src/
│       ├── main.rs       # Tauri commands
│       └── db.rs         # Database logic
├── public/               # Static assets
└── package.json
```

## 📦 Dependencies

### Frontend
- **react** - UI framework
- **vite** - Build tool
- **tailwindcss** - Styling
- **@tanstack/react-table** - Table component
- **@expiry-alert/shared** - Shared types & utilities

### Backend
- **tauri** - Desktop framework
- **rusqlite** - SQLite database
- **serde** - Serialization

## 🔧 Development

### Prerequisites
- Node.js 20+
- Rust 1.70+
- Visual Studio Build Tools (Windows)

### Install Dependencies
```bash
npm install
```

### Run Dev Mode
```bash
npm run tauri:dev
```

### Build for Production
```bash
npm run tauri:build
```

**Output:** `src-tauri/target/release/bundle/`

## 💾 Database

**Location:**
- Windows: `%LOCALAPPDATA%\reagent-expiry-tracker\reagents.db`
- macOS: `~/Library/Application Support/reagent-expiry-tracker/reagents.db`
- Linux: `~/.local/share/reagent-expiry-tracker/reagents.db`

**Backup:**
Simply copy the `reagents.db` file to a safe location.

## 🌐 Translations

- English: `src/i18n/locales/en.json`
- Hebrew: `src/i18n/locales/he.json`

## 🐛 Troubleshooting

### Build fails (Rust errors)
```bash
cd src-tauri
cargo clean
cd ..
npm run tauri:build
```

### TypeScript errors
```bash
npx tsc --noEmit
```

### Shared package not found
```bash
cd ../..
npm install
```

## 📖 More Info

- [BUILD.md](../../BUILD.md) - Detailed build instructions
- [SETUP_WINDOWS.md](../../SETUP_WINDOWS.md) - Windows setup
- [MONOREPO.md](../../MONOREPO.md) - Complete documentation
