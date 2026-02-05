# Expiry Alert - Monorepo Complete Guide

## 📱 Platform Support

| Platform | Status | Size | Technology |
|----------|--------|------|------------|
| **Windows Desktop** | ✅ Ready | 5-15 MB | Tauri + React |
| **Android** | ✅ Ready | 15-30 MB | React Native |
| **iOS** | ✅ Ready | 15-30 MB | React Native |
| **macOS Desktop** | ⚠️ Untested | 5-15 MB | Tauri + React |
| **Linux Desktop** | ⚠️ Untested | 5-15 MB | Tauri + React |

---

## 🏗️ Project Structure

```
Expiry-Alert/
├── apps/
│   ├── desktop/                    # Desktop application
│   │   ├── src/                    # React frontend
│   │   ├── src-tauri/              # Rust backend
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── mobile/                     # Mobile application
│       ├── src/
│       │   ├── screens/            # App screens
│       │   ├── components/         # Reusable components
│       │   ├── services/           # Database, API
│       │   └── i18n/               # Translations
│       ├── app.json                # Expo config
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                     # Shared package
│       ├── src/
│       │   ├── types.ts            # TypeScript types
│       │   ├── utils.ts            # Utility functions
│       │   ├── constants.ts        # App constants
│       │   └── index.ts            # Entry point
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                    # Root workspace config
├── README.md                       # Quick start
└── MONOREPO.md                     # This file
```

---

## 📦 Shared Package (`@expiry-alert/shared`)

### What's Shared?

The `shared` package contains code used by **both** desktop and mobile apps:

#### 1. **Types** (`types.ts`)
```typescript
export interface Reagent {
  id: number;
  name: string;
  category: 'reagents' | 'beads';
  expiry_date: string;
  lot_number?: string;
  received_date?: string;
  notes?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeneralNote {
  id: number;
  content: string;
  created_at: string;
}

export type ExpiryStatus = 'expired' | 'expiring-soon' | 'expiring-week' | 'ok';
```

#### 2. **Utilities** (`utils.ts`)
```typescript
export function getExpiryStatus(expiryDate: string): ExpiryStatus;
export function getDaysUntilExpiry(expiryDate: string): number;
export function formatDate(date: string | Date, locale?: string): string;
```

#### 3. **Constants** (`constants.ts`)
```typescript
export const APP_NAME = 'Reagent Expiry Tracker';
export const DEFAULT_NOTIFICATION_DAYS = 5;
export const EXPIRY_WARNING_DAYS = 7;
export const CATEGORIES = { REAGENTS: 'reagents', BEADS: 'beads' };
```

### Usage in Apps

**Desktop:**
```typescript
import { Reagent, getDaysUntilExpiry } from '@expiry-alert/shared';
```

**Mobile:**
```typescript
import { Reagent, getDaysUntilExpiry } from '@expiry-alert/shared';
```

Same code, works everywhere! ✨

---

## 🖥️ Desktop App (`apps/desktop`)

### Technology
- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Rust + Tauri 1.5
- **UI:** TailwindCSS + shadcn/ui
- **Table:** TanStack Table v8
- **Database:** SQLite (rusqlite)
- **i18n:** i18next

### Features
✅ Bulk add (4 reagents at once)
✅ Sortable table columns
✅ Multi-select with checkboxes
✅ Export to CSV
✅ RTL support (Hebrew)
✅ System notifications (Windows)
✅ Auto-archive expired items

### Development

```bash
# Navigate to desktop app
cd apps/desktop

# Install dependencies (if not installed via root)
npm install

# Run in dev mode
npm run tauri:dev
```

### Build

```bash
# From root:
npm run tauri:build

# Or from desktop app:
cd apps/desktop
npm run tauri:build
```

**Output:** `apps/desktop/src-tauri/target/release/bundle/`

### Database Location
- **Windows:** `%LOCALAPPDATA%\reagent-expiry-tracker\reagents.db`
- **macOS:** `~/Library/Application Support/reagent-expiry-tracker/reagents.db`
- **Linux:** `~/.local/share/reagent-expiry-tracker/reagents.db`

---

## 📱 Mobile App (`apps/mobile`)

### Technology
- **Framework:** React Native + Expo 50
- **UI:** React Native Paper
- **Navigation:** React Navigation
- **Database:** SQLite (expo-sqlite)
- **i18n:** i18next

### Features
✅ Touch-optimized UI
✅ Pull-to-refresh
✅ Bottom tab navigation
✅ Local SQLite database
✅ Offline-first
✅ Dark mode support

### Development

```bash
# From root:
npm run dev:mobile

# Or from mobile app:
cd apps/mobile
npm start
```

### Running on Devices

#### Android
```bash
npm run android
```

**Requirements:**
- Android Studio installed
- Android emulator running OR physical device connected

#### iOS
```bash
npm run ios
```

**Requirements:**
- macOS only
- Xcode installed
- iOS simulator running OR physical device connected

#### Expo Go (Quick Test)
1. Install [Expo Go](https://expo.dev/client) on your phone
2. Run `npm start` in `apps/mobile`
3. Scan QR code with Expo Go app

### Building for Production

#### Setup EAS (Expo Application Services)
```bash
npm install -g eas-cli
cd apps/mobile
eas login
eas build:configure
```

#### Build Android APK
```bash
eas build --platform android --profile preview
```

#### Build iOS (requires Apple Developer account)
```bash
eas build --platform ios
```

### Database Location
- **Android:** `/data/data/com.bloodbank.reagenttracker/databases/reagents.db`
- **iOS:** App sandbox SQLite directory

---

## 🔄 Workspace Commands (from root)

```bash
# Desktop
npm run tauri:dev              # Run desktop in dev mode
npm run tauri:build            # Build desktop installer

# Mobile
npm run dev:mobile             # Start Expo dev server
npm run android                # Run on Android
npm run ios                    # Run on iOS

# All
npm run typecheck              # Type check all packages
npm run clean                  # Clean all node_modules
```

---

## 🛠️ Development Workflow

### Scenario 1: Adding a New Feature

**Example:** Add "Manufacturer" field to reagents

1. **Update Types** (`packages/shared/src/types.ts`)
```typescript
export interface Reagent {
  // ... existing fields
  manufacturer?: string;  // ← Add this
}
```

2. **Update Desktop UI** (`apps/desktop/src/`)
- Add form field in `BulkAddForm.tsx`
- Update table column in `ReagentTable.tsx`

3. **Update Mobile UI** (`apps/mobile/src/`)
- Add form field in add screen
- Update card display in `ReagentCard.tsx`

4. **Update Database**
- Desktop: `apps/desktop/src-tauri/src/db.rs`
- Mobile: `apps/mobile/src/services/database.ts`

5. **Test Both Apps**
```bash
npm run tauri:dev      # Test desktop
npm run dev:mobile     # Test mobile
```

---

### Scenario 2: Fixing a Bug in Shared Code

**Example:** Fix date formatting bug

1. **Fix in Shared Package** (`packages/shared/src/utils.ts`)
```typescript
export function formatDate(date: string | Date, locale = 'en-US'): string {
  // Fix the bug here
}
```

2. **Automatic in Both Apps**
✅ Desktop automatically uses fixed version
✅ Mobile automatically uses fixed version

3. **Test Both**
```bash
npm run typecheck     # Ensure no type errors
npm run tauri:dev     # Test desktop
npm run dev:mobile    # Test mobile
```

---

## 📖 Code Sharing Examples

### ✅ What IS Shared

| Code | Location | Used By |
|------|----------|---------|
| TypeScript types | `packages/shared/src/types.ts` | Desktop + Mobile |
| Business logic | `packages/shared/src/utils.ts` | Desktop + Mobile |
| Constants | `packages/shared/src/constants.ts` | Desktop + Mobile |
| Date utilities | `packages/shared/src/utils.ts` | Desktop + Mobile |

### ❌ What is NOT Shared

| Code | Reason |
|------|--------|
| UI Components | Different frameworks (React vs React Native) |
| Database layer | Different implementations (Rust vs TypeScript) |
| Navigation | Platform-specific |
| Styling | Different systems (TailwindCSS vs StyleSheet) |

---

## 🔧 Adding Dependencies

### To Desktop App Only
```bash
cd apps/desktop
npm install some-package
```

### To Mobile App Only
```bash
cd apps/mobile
npm install react-native-something
```

### To Shared Package
```bash
cd packages/shared
npm install date-fns  # Example
```

### To All (Root)
```bash
npm install --save-dev prettier  # Dev tools
```

---

## 🐛 Troubleshooting

### "Cannot find module '@expiry-alert/shared'"

**Fix:**
```bash
# Reinstall from root
npm install
```

### Desktop Build Fails (Rust errors)

**Fix:**
```bash
cd apps/desktop/src-tauri
cargo clean
cd ../..
npm run tauri:build
```

### Mobile App Won't Start

**Fix:**
```bash
cd apps/mobile
npx expo start -c  # Clear cache
```

### TypeScript Errors After Adding to Shared

**Fix:**
```bash
cd packages/shared
npm run typecheck

# Then restart dev servers
```

---

## 📊 Benefits of This Architecture

| Benefit | Description |
|---------|-------------|
| **Code Reuse** | 30% of code is shared between platforms |
| **Type Safety** | TypeScript types ensure consistency |
| **Single Source of Truth** | Business logic defined once |
| **Easier Refactoring** | Change types → affects all apps |
| **Faster Development** | Write utility once, use everywhere |
| **Better Testing** | Test shared code once |

---

## 🚀 Deployment

### Desktop

**Windows:**
1. Build: `npm run tauri:build`
2. Get installer: `apps/desktop/src-tauri/target/release/bundle/msi/`
3. Distribute `.msi` file

**macOS:**
1. Build: `npm run tauri:build`
2. Get app: `apps/desktop/src-tauri/target/release/bundle/dmg/`
3. Distribute `.dmg` file

### Mobile

**Android (APK):**
```bash
cd apps/mobile
eas build --platform android --profile preview
```

Download APK and sideload or publish to Google Play.

**iOS:**
```bash
cd apps/mobile
eas build --platform ios
```

Requires Apple Developer account ($99/year).

---

## 📝 Future Enhancements

### Planned Features
- [ ] Google Drive sync
- [ ] Push notifications (mobile)
- [ ] Barcode scanning (mobile)
- [ ] CSV import
- [ ] Web app (React)
- [ ] Cloud backend (optional)

### Technical Improvements
- [ ] E2E testing (Playwright)
- [ ] Unit tests (Vitest)
- [ ] CI/CD pipeline
- [ ] Automated releases
- [ ] Crash reporting

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 License

MIT License - See [LICENSE](./LICENSE)

---

**Happy Coding! 🎉**
