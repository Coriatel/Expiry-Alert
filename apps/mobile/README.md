# Expiry Alert - Mobile App

React Native mobile application for tracking reagent expiration.

## 🚀 Quick Start

```bash
# From project root:
npm run dev:mobile

# Or from this directory:
npm start
```

## 📱 Running on Devices

### Android
```bash
npm run android
```

### iOS
```bash
npm run ios
```

### Expo Go
1. Install Expo Go on your phone
2. Run `npm start`
3. Scan QR code

## 🏗️ Project Structure

```
apps/mobile/
├── src/
│   ├── screens/          # Main screens
│   ├── components/       # Reusable UI components
│   ├── services/         # Database, API services
│   └── i18n/             # Translations
├── assets/               # Images, fonts, icons
├── app.json              # Expo configuration
└── package.json
```

## 📦 Dependencies

- **expo** - React Native framework
- **react-native-paper** - Material Design components
- **@react-navigation** - Navigation
- **expo-sqlite** - Local database
- **@expiry-alert/shared** - Shared types & utilities

## 🔧 Development

### Install Dependencies
```bash
npm install
```

### Start Dev Server
```bash
npm start
```

### Clear Cache
```bash
npx expo start -c
```

## 📲 Building for Production

### Setup EAS
```bash
npm install -g eas-cli
eas login
eas build:configure
```

### Build Android
```bash
eas build --platform android
```

### Build iOS
```bash
eas build --platform ios
```

## 💾 Database

- **Location:** App-specific storage (SQLite)
- **Size:** ~1-10 MB depending on data
- **Backup:** Manual export/import (coming soon)

## 🌐 Translations

Translations are shared with desktop app:
- English: `src/i18n/locales/en.json`
- Hebrew: `src/i18n/locales/he.json`

## 🐛 Troubleshooting

### App won't start
```bash
npx expo start -c
rm -rf node_modules
npm install
```

### Database errors
```bash
# Reset app data on device
```

### Shared package not found
```bash
cd ../..
npm install
```

## 📖 More Info

See [MONOREPO.md](../../MONOREPO.md) for complete documentation.
