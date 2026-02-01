# Reagent Expiry Tracker | מעקב תפוגת ריאגנטים

**Desktop & Mobile Apps** for tracking reagent expiration dates in blood banks and medical laboratories.

**אפליקציות דסקטופ ומובייל** לניהול ומעקב תפוגת ריאגנטים בבנקי דם ומעבדות רפואיות.

---

## 🏗️ Monorepo Structure

This project uses a **monorepo** architecture with shared code between platforms:

```
Expiry-Alert/
├── apps/
│   ├── desktop/          # Tauri desktop app (Windows/Mac/Linux)
│   └── mobile/           # React Native app (iOS/Android)
├── packages/
│   └── shared/           # Shared types, utilities, business logic
└── package.json          # Workspace root
```

---

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Run Desktop App
```bash
npm run tauri:dev
```

### Run Mobile App
```bash
npm run dev:mobile
```

---

## 📖 Documentation

- **[INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md)** - מדריך התקנה למשתמשים (עברית)
- **[BUILD_GUIDE.md](./BUILD_GUIDE.md)** - Build guide for developers
- **[MONOREPO.md](./MONOREPO.md)** - Complete architecture documentation

---

## 📥 Installation

### For End Users

Download the latest release from [Releases](../../releases):
- **Windows:** Download `.msi` or `.exe` file
- **Android:** Download `.apk` file
- **iOS:** TestFlight (requires Apple Developer account)

See [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) for detailed instructions.

### For Developers

```bash
# Clone the repository
git clone https://github.com/Coriatel/Expiry-Alert.git
cd Expiry-Alert

# Install dependencies
npm install

# Run desktop app
npm run tauri:dev

# Run mobile app
npm run dev:mobile
```

See [BUILD_GUIDE.md](./BUILD_GUIDE.md) for building production releases.

---

## ✨ Features

### Desktop App
- ✅ Track reagents with expiration dates
- ✅ Color-coded expiry status (red/orange/yellow/green)
- ✅ Bulk add (4 reagents at once)
- ✅ Archive functionality
- ✅ Multi-select for bulk operations
- ✅ General notes for shift communication
- ✅ Hebrew + English UI with RTL support
- ✅ Local SQLite database (no internet required)
- ✅ In-app notifications
- ✅ Sortable columns

### Mobile App
- ✅ Same features as desktop
- ✅ Touch-optimized UI
- ✅ Bottom tab navigation
- ✅ Material Design (React Native Paper)
- ✅ Offline-first architecture

---

## 🔒 Privacy & Security

- **100% Local** - All data stored on your device
- **No Internet Required** - Works completely offline
- **No Account Needed** - Single user system
- **No Tracking** - No analytics or telemetry
- **Open Source** - Fully transparent code

---

## 🛠️ Technology Stack

### Desktop
- **Tauri 1.5** - Lightweight desktop framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Rust** - Backend logic
- **SQLite** - Local database
- **Vite** - Fast build tool

### Mobile
- **React Native** - Mobile framework
- **Expo 50** - Development platform
- **TypeScript** - Type safety
- **SQLite** - Local database
- **React Navigation** - Navigation

### Shared
- **~30% code sharing** between platforms
- **Shared types** - Type safety across apps
- **Shared utilities** - Business logic reuse

### Web / API (PWA Deployment)
- **Directus** for app data
- **@directus/sdk** used by the API layer
- **web-push + node-cron** for expiry notifications
- **vite-plugin-pwa + workbox-window** for PWA support
- **React 19.0.0** pinned via root overrides

---

## 🧰 Repo Utilities

### /cpm (commit + push + merge, without deps)
```bash
./scripts/cpm.sh "Your commit message"
```

Notes:
- Skips dependency artifacts (for example `node_modules`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`).
- If you update dependencies, document the change here and commit lockfiles separately.
- Merges into the default remote branch (origin/HEAD).

---

**Made with ❤️ for Blood Banks and Medical Laboratories**
