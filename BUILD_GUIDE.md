# מדריך בנייה | Build Guide

מדריך זה מיועד למפתחים שרוצים לבנות את האפליקציה בעצמם.

---

## 🏗️ בניית אפליקציית Desktop

### דרישות מקדימות
- **Windows 10/11** (לבניית .exe/.msi)
- **Node.js 20+** - [הורדה](https://nodejs.org/)
- **Rust 1.70+** - [הורדה](https://rustup.rs/)
- **Visual Studio Build Tools** - [הורדה](https://visualstudio.microsoft.com/downloads/)

### התקנה
```bash
# 1. התקן את כל התלויות
npm install

# 2. בדוק ש-Rust מותקן
rustc --version
cargo --version
```

### בנייה למצב Development
```bash
# הרץ במצב פיתוח (hot reload)
npm run tauri:dev
```

### בנייה למצב Production (קובץ התקנה)
```bash
# בנה קובץ .exe ו-.msi
npm run tauri:build
```

**הקבצים יהיו ב:**
- `apps/desktop/src-tauri/target/release/bundle/msi/` - קובץ .msi (מומלץ)
- `apps/desktop/src-tauri/target/release/bundle/nsis/` - קובץ .exe installer

### גודל הקובץ הסופי
- **~15-25 MB** (דחוס)
- **~40-60 MB** (לאחר התקנה)

### אימות Build
```bash
# הרץ את הקובץ הסופי
cd apps/desktop/src-tauri/target/release
./reagent-expiry-tracker.exe
```

---

## 📱 בניית אפליקציית Mobile

### דרישות מקדימות
- **Node.js 20+**
- **Java JDK 17** (לאנדרואיד)
- **Android Studio** (לאנדרואיד) - [הורדה](https://developer.android.com/studio)
- **Xcode** (ל-iOS, רק על macOS)
- **חשבון Expo** (אופציונלי, לEAS Build)

### התקנה
```bash
# 1. התקן תלויות
npm install

# 2. התקן Expo CLI
npm install -g @expo/cli eas-cli
```

### בנייה למצב Development
```bash
# הרץ עם Expo Go
cd apps/mobile
npm start

# סרוק QR code באפליקציית Expo Go
```

### בנייה למצב Production

#### אופציה 1: Local Build (Android)
```bash
cd apps/mobile

# צור build Android מקומי
npx expo prebuild --platform android

# בנה APK
cd android
./gradlew assembleRelease

# הקובץ יהיה ב:
# android/app/build/outputs/apk/release/app-release.apk
```

#### אופציה 2: EAS Build (מומלץ)
```bash
cd apps/mobile

# התחבר ל-Expo
eas login

# הגדר את הפרויקט
eas build:configure

# בנה APK (Android)
eas build --platform android --profile production

# בנה ל-iOS
eas build --platform ios --profile production
```

### גודל הקובץ הסופי
- **Android APK:** ~30-50 MB
- **iOS IPA:** ~40-60 MB

### אימות Build
```bash
# התקן על מכשיר Android
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔄 Build דרך GitHub Actions (אוטומטי)

### הגדרה
1. **Fork את הרפוזיטורי**
2. **הוסף Secrets** (אם נדרש):
   - Settings → Secrets → Actions
   - `EXPO_TOKEN` (אם משתמש ב-EAS)

### הרצת Build
1. **Push לגיט:**
   ```bash
   git add .
   git commit -m "Build apps"
   git push
   ```

2. **בדוק את הProgress:**
   - עבור ל-"Actions" בGitHub
   - לחץ על הBuild הכי אחרון
   - המתן לסיום (~10-30 דקות)

3. **הורד את הקבצים:**
   - לחץ על הBuild שהסתיים
   - גלול למטה ל-"Artifacts"
   - הורד `windows-installer` ו/או `android-apk`

---

## 🧪 בדיקות

### בדיקת TypeScript
```bash
# Desktop
cd apps/desktop
npx tsc --noEmit

# Mobile
cd apps/mobile
npx tsc --noEmit

# Shared
cd packages/shared
npx tsc --noEmit
```

### בדיקת Rust
```bash
cd apps/desktop/src-tauri
cargo check
cargo test
```

### בדיקת Build
```bash
# Desktop
npm run tauri:build

# Mobile (local)
cd apps/mobile
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

---

## 📦 Release Process

### 1. עדכן גרסה
```bash
# עדכן ב-package.json
# עדכן ב-apps/desktop/src-tauri/tauri.conf.json
# עדכן ב-apps/mobile/app.json
```

### 2. בנה את הקבצים
```bash
# Desktop (על Windows)
npm run tauri:build

# Mobile (EAS)
cd apps/mobile
eas build --platform all --profile production
```

### 3. צור Release בGitHub
1. עבור ל-Releases
2. לחץ "Draft a new release"
3. צור Tag חדש (למשל `v1.0.1`)
4. העלה את הקבצים:
   - Windows: `.msi` ו-`.exe`
   - Android: `.apk`
   - iOS: `.ipa` (אם רלוונטי)
5. פרסם!

---

## 🔧 פתרון בעיות Build

### Desktop

**שגיאות Rust:**
```bash
cd apps/desktop/src-tauri
cargo clean
cargo build
```

**שגיאות Node:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Windows Defender חוסם:**
- הוסף חריגה לתיקיית הפרויקט
- Settings → Windows Security → Virus & threat protection → Exclusions

### Mobile

**שגיאות Gradle:**
```bash
cd apps/mobile/android
./gradlew clean
./gradlew build
```

**שגיאות Metro:**
```bash
npx expo start -c
rm -rf node_modules
npm install
```

**שגיאות EAS:**
```bash
eas build:configure
eas login
```

---

## 📊 Build Sizes

### Desktop (Windows)
- **Source:** ~50MB
- **Dependencies:** ~500MB (node_modules + cargo)
- **Final .msi:** ~20MB
- **Installed:** ~50MB

### Mobile (Android)
- **Source:** ~20MB
- **Dependencies:** ~400MB (node_modules)
- **Final .apk:** ~35MB
- **Installed:** ~80MB

---

## 🚀 Optimization Tips

### Desktop
1. **Enable LTO** (Link Time Optimization) ב-Cargo.toml:
   ```toml
   [profile.release]
   lto = true
   codegen-units = 1
   ```

2. **Minify Frontend:**
   - הופעל אוטומטית ב-Vite

### Mobile
1. **Enable Hermes:**
   ```json
   // app.json
   "expo": {
     "android": {
       "enableHermes": true
     }
   }
   ```

2. **Tree Shaking:**
   - הופעל אוטומטית ב-Metro bundler

---

**נבנה בהצלחה?** 🎉 שתף את הפידבק שלך!
