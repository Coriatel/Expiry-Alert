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

## 📖 Full Documentation

See [MONOREPO_README.md](./MONOREPO_README.md) for complete documentation.

---

**Made with ❤️ for Blood Banks and Medical Laboratories**
