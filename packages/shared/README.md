# @expiry-alert/shared

Shared types, utilities, and business logic for Expiry Alert apps.

## 📦 What's Inside?

This package contains code shared between Desktop and Mobile apps:

- **Types** - TypeScript interfaces
- **Utilities** - Date, formatting, status functions
- **Constants** - App-wide constants

## 🚀 Usage

### In Desktop App
```typescript
import { Reagent, getDaysUntilExpiry } from '@expiry-alert/shared';
```

### In Mobile App
```typescript
import { Reagent, getDaysUntilExpiry } from '@expiry-alert/shared';
```

## 📝 API

### Types

```typescript
interface Reagent {
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

interface GeneralNote {
  id: number;
  content: string;
  created_at: string;
}

interface NotificationSettings {
  id: number;
  enabled: boolean;
  remind_in_days: number;
}

interface ReagentFormData {
  name: string;
  category: 'reagents' | 'beads';
  expiryDate: string;
  lotNumber?: string;
  receivedDate?: string;
  notes?: string;
}

type ExpiryStatus = 'expired' | 'expiring-soon' | 'expiring-week' | 'ok';
```

### Utilities

```typescript
// Get expiry status based on date
function getExpiryStatus(expiryDate: string): ExpiryStatus

// Calculate days until expiry
function getDaysUntilExpiry(expiryDate: string): number

// Get color class for status
function getStatusColor(status: ExpiryStatus): string

// Format date for display
function formatDate(date: string | Date, locale?: string): string
```

### Constants

```typescript
const APP_NAME = 'Reagent Expiry Tracker';
const APP_VERSION = '1.0.0';
const DEFAULT_NOTIFICATION_DAYS = 5;
const EXPIRY_WARNING_DAYS = 7;
const EXPIRY_URGENT_DAYS = 2;

const CATEGORIES = {
  REAGENTS: 'reagents',
  BEADS: 'beads',
};

const STATUS_COLORS = {
  expired: '#EF4444',
  'expiring-soon': '#F97316',
  'expiring-week': '#EAB308',
  ok: '#22C55E',
};
```

## 🔧 Development

### Type Checking
```bash
npm run typecheck
```

### Building
No build step needed - TypeScript files are used directly via workspace resolution.

## 📖 Adding New Shared Code

1. Add to appropriate file (`types.ts`, `utils.ts`, `constants.ts`)
2. Export from `index.ts`
3. Use in Desktop/Mobile apps

Example:
```typescript
// packages/shared/src/utils.ts
export function newUtility() {
  // ...
}

// packages/shared/src/index.ts
export * from './utils';  // Already exported

// apps/desktop/src/SomeComponent.tsx
import { newUtility } from '@expiry-alert/shared';
```

## 🎯 Benefits

✅ **Single Source of Truth** - Types defined once
✅ **Type Safety** - Shared interfaces ensure consistency
✅ **Code Reuse** - Business logic written once
✅ **Easier Refactoring** - Change propagates to all apps
✅ **Better Testing** - Test shared code independently

## 📄 License

MIT
