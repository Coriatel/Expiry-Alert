# Building Reagent Expiry Tracker

Complete guide for building the application for Windows.

## Prerequisites

### 1. Install Rust

**Windows (PowerShell as Administrator):**
```powershell
# Download and run rustup-init.exe from:
# https://rustup.rs/

# After installation, verify:
rustc --version
cargo --version
```

### 2. Install Node.js

Download Node.js 20 LTS from: https://nodejs.org/

Verify installation:
```bash
node --version
npm --version
```

### 3. Install Build Tools (Windows)

```powershell
# Install Visual Studio C++ Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/
# Select "Desktop development with C++" workload
```

### 4. Install WebView2 (Usually pre-installed on Windows 11)

Download from: https://developer.microsoft.com/microsoft-edge/webview2/

---

## Build Steps

### Step 1: Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd Expiry-Alert

# Install dependencies
npm install
```

### Step 2: Generate App Icons (Optional but Recommended)

Create a 1024x1024 PNG icon and place it in the project root as `app-icon.png`, then:

```bash
npm install --save-dev @tauri-apps/cli
npx tauri icon app-icon.png
```

This will generate all required icon sizes in `src-tauri/icons/`.

**OR** use placeholder icons - the app will work but without a custom icon.

### Step 3: Build for Production

```bash
npm run tauri:build
```

This will:
1. Build the React frontend (optimized)
2. Compile the Rust backend
3. Create installers

Build time: 5-15 minutes (first build is slower)

### Step 4: Find Your Installer

**Location:**
```
src-tauri/target/release/bundle/
```

**Available installers:**

1. **MSI Installer** (Recommended for IT deployment):
   - `src-tauri/target/release/bundle/msi/Reagent Expiry Tracker_1.0.0_x64_en-US.msi`
   - Professional installer
   - Adds to Windows Programs list
   - Can be deployed via Group Policy

2. **NSIS Installer** (User-friendly):
   - `src-tauri/target/release/bundle/nsis/Reagent Expiry Tracker_1.0.0_x64-setup.exe`
   - Easy click-to-install
   - Progress bar and custom options

3. **Portable Executable** (No installation required):
   - `src-tauri/target/release/reagent-expiry-tracker.exe`
   - Run directly without installation
   - Good for USB drives or testing

---

## Build Configuration

### Change App Name or Version

Edit `src-tauri/tauri.conf.json`:

```json
{
  "package": {
    "productName": "Reagent Expiry Tracker",
    "version": "1.0.0"
  }
}
```

Also update `src-tauri/Cargo.toml`:

```toml
[package]
name = "reagent-expiry-tracker"
version = "1.0.0"
```

### Optimize Build Size

Already optimized! The installer is ~5-15MB (much smaller than Electron).

**Current optimizations:**
- SQLite bundled statically
- Minimal Tauri features enabled
- Production build with optimizations

### Code Signing (Optional, for trusted installations)

To sign the installer (prevents Windows SmartScreen warnings):

1. Obtain a code signing certificate
2. Export your certificate thumbprint before building:

```bash
# PowerShell
$env:TAURI_WINDOWS_CERT_THUMBPRINT="YOUR_CERTIFICATE_THUMBPRINT"
$env:TAURI_WINDOWS_TIMESTAMP_URL="http://timestamp.digicert.com"
```

The build script will inject these into `src-tauri/tauri.conf.json` before packaging.
If you prefer, you can still edit the file manually:

```json
{
  "tauri": {
    "bundle": {
      "windows": {
        "certificateThumbprint": "YOUR_CERTIFICATE_THUMBPRINT",
        "digestAlgorithm": "sha256",
        "timestampUrl": "http://timestamp.digicert.com"
      }
    }
  }
}
```

---

## Troubleshooting Build Issues

### Error: "rustc not found"

```bash
# Restart your terminal/PowerShell
# Then verify Rust is in PATH:
rustc --version

# If not found, run:
source $HOME/.cargo/env  # Linux/Mac
# OR restart terminal on Windows
```

### Error: "VCRUNTIME140.dll not found"

Install Visual C++ Redistributable:
https://aka.ms/vs/17/release/vc_redist.x64.exe

### Error: "failed to run custom build command for 'openssl-sys'"

```bash
# Windows: Install Perl
# Download from: https://strawberryperl.com/
```

### Build is very slow

First build: 5-15 minutes (normal - compiling Rust dependencies)
Subsequent builds: 1-3 minutes

**Speed up:**
```bash
# Use release profile for faster runtime, dev profile for faster builds
npm run tauri:dev  # Dev build (faster to build)
npm run tauri:build  # Release build (faster to run)
```

### Out of disk space

Rust builds can use 1-2GB of space. Clean up:

```bash
# Remove build artifacts
cd src-tauri
cargo clean
```

---

## Advanced: Custom Build Profiles

Edit `src-tauri/Cargo.toml`:

```toml
[profile.release]
opt-level = "z"     # Optimize for size
lto = true          # Link-time optimization
codegen-units = 1   # Better optimization, slower build
strip = true        # Remove debug symbols
```

---

## Distribution

### For Internal Use (Blood Bank/Lab)

1. Build the MSI installer
2. Copy to network share
3. Users double-click to install
4. Data is stored locally per user

### For IT Deployment

```powershell
# Silent install via MSI
msiexec /i "Reagent Expiry Tracker_1.0.0_x64_en-US.msi" /quiet /norestart

# Silent uninstall
msiexec /x "Reagent Expiry Tracker_1.0.0_x64_en-US.msi" /quiet /norestart
```

### Portable Version (No Installation)

Distribute the `.exe` file directly:
1. Copy `reagent-expiry-tracker.exe`
2. Users run it directly
3. Database created in `%LOCALAPPDATA%\reagent-expiry-tracker\`

---

## Updating the App

### For Users:

1. Download new installer
2. Run it (will update existing installation)
3. Data is preserved automatically

### For Developers:

1. Increment version in `tauri.conf.json` and `Cargo.toml`
2. Build new installer
3. Distribute

**Auto-update:** Not implemented in MVP. Consider Tauri's auto-updater for future versions.

---

## Testing the Build

```bash
# After building, test the installer:

# 1. Install on a clean Windows VM
# 2. Verify app starts
# 3. Add test data
# 4. Close app and reopen - data should persist
# 5. Uninstall - check for leftover files
```

---

## Build Checklist

Before releasing:

- [ ] Updated version numbers
- [ ] Generated custom app icons
- [ ] Tested in dev mode: `npm run tauri:dev`
- [ ] Successful production build: `npm run tauri:build`
- [ ] Tested MSI installer on clean Windows
- [ ] Verified database creation and persistence
- [ ] Tested both English and Hebrew UI
- [ ] Verified RTL layout (Hebrew)
- [ ] No console errors in production
- [ ] App properly uninstalls
- [ ] README is up to date

---

## Support

For build issues, check:
1. Tauri docs: https://tauri.app/v1/guides/
2. Rust docs: https://www.rust-lang.org/learn
3. Open an issue on the repository
