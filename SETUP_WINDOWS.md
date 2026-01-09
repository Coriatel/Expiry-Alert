# Windows Setup Guide | מדריך התקנה ל-Windows

Complete setup guide for Windows users and developers.

---

## For End Users (Installing the App)

### Option 1: MSI Installer (Recommended)

1. Download `Reagent Expiry Tracker_1.0.0_x64_en-US.msi`
2. Double-click to run
3. Follow the installation wizard
4. App will be available in Start Menu
5. Launch and start tracking reagents!

**Where is my data stored?**
```
C:\Users\<YourUsername>\AppData\Local\reagent-expiry-tracker\reagents.db
```

**To backup your data:** Copy the `reagents.db` file to a safe location (USB drive, network folder, etc.)

### Option 2: Portable Version (No Installation)

1. Download `reagent-expiry-tracker.exe`
2. Place it anywhere (Desktop, USB drive, etc.)
3. Double-click to run
4. No installation needed!

**Note:** Database is still created in `AppData\Local`, not next to the exe.

---

## For Developers (Setting Up Development Environment)

### Step 1: Install Rust

1. Download Rust installer from: https://rustup.rs/
2. Run `rustup-init.exe`
3. Choose "1) Proceed with installation (default)"
4. Wait for installation (5-10 minutes)
5. Restart PowerShell/Terminal

**Verify installation:**
```powershell
rustc --version
# Should show: rustc 1.x.x
```

### Step 2: Install Node.js

1. Download Node.js 20 LTS from: https://nodejs.org/
2. Run the installer
3. Check "Add to PATH" (default)
4. Complete installation

**Verify installation:**
```powershell
node --version
# Should show: v20.x.x

npm --version
# Should show: 10.x.x
```

### Step 3: Install Build Tools

**Option A: Visual Studio 2022 (Recommended)**
1. Download: https://visualstudio.microsoft.com/downloads/
2. Install "Desktop development with C++" workload
3. Size: ~6GB

**Option B: Build Tools Only (Smaller)**
1. Download: https://visualstudio.microsoft.com/downloads/ (scroll down to "Build Tools")
2. Install "C++ build tools"
3. Size: ~3GB

### Step 4: Install WebView2 Runtime

Usually pre-installed on Windows 11. If needed:
1. Download: https://developer.microsoft.com/microsoft-edge/webview2/
2. Run "Evergreen Bootstrapper"

### Step 5: Install pnpm (Optional but Recommended)

```powershell
npm install -g pnpm
```

### Step 6: Clone and Install

```powershell
git clone <your-repo-url>
cd Expiry-Alert

# Install dependencies
pnpm install
# OR
npm install
```

### Step 7: Run Development Mode

```powershell
pnpm tauri:dev
# OR
npm run tauri:dev
```

App should open automatically. You're ready to develop!

---

## Common Windows Issues

### Issue: "rustc is not recognized"

**Solution:**
1. Close PowerShell/Terminal
2. Open new PowerShell/Terminal
3. Try again

If still not working:
```powershell
# Add Rust to PATH manually
$env:Path += ";$env:USERPROFILE\.cargo\bin"
```

### Issue: "VCRUNTIME140.dll is missing"

**Solution:**
Install Visual C++ Redistributable:
```
https://aka.ms/vs/17/release/vc_redist.x64.exe
```

### Issue: "WebView2 not found"

**Solution:**
1. Download: https://go.microsoft.com/fwlink/p/?LinkId=2124703
2. Install the "Evergreen Standalone Installer"

### Issue: Build fails with "linker error"

**Solution:**
Install Visual Studio C++ Build Tools (see Step 3 above)

### Issue: "Access Denied" when building

**Solution:**
1. Run PowerShell as Administrator
2. Or disable antivirus temporarily during build

### Issue: Slow build times

**Normal:** First build takes 5-15 minutes
**Subsequent builds:** 1-3 minutes

**Speed up:**
- Use SSD
- Close other programs
- Use `dev` mode for development: `npm run tauri:dev`

---

## Firewall and Antivirus

### Windows Defender

The first time you run the dev server, Windows Firewall may ask for permission:
- ✅ Allow "node.exe" on Private networks
- ✅ Allow "cargo.exe" if prompted

### Antivirus Software

Some antivirus may flag Rust builds as suspicious (false positive).
**Whitelist these folders:**
```
Expiry-Alert\src-tauri\target\
%USERPROFILE%\.cargo\
```

---

## Running on Restricted Networks

If your hospital/lab network blocks certain ports or tools:

### Development Server
Default port: 1420 (can be changed in `vite.config.ts`)

### No Internet Required
Once dependencies are installed, the app works 100% offline.

### IT Approval
Show IT department:
- README.md (explains local-only data storage)
- This file (setup instructions)
- All data stays on local machine (no cloud/internet)

---

## Portable Development Setup

Want to develop on a USB drive? (For restricted environments)

1. Install Rust and Node.js on USB (portable versions available)
2. Clone repo to USB
3. Run from USB

**Note:** Builds will be slower from USB.

---

## Database Management on Windows

### Viewing the Database

Download DB Browser for SQLite:
```
https://sqlitebrowser.org/
```

Open the database file:
```
C:\Users\<YourUsername>\AppData\Local\reagent-expiry-tracker\reagents.db
```

### Backing Up Database

**Manual Backup:**
```powershell
# Copy database to backup folder
Copy-Item "$env:LOCALAPPDATA\reagent-expiry-tracker\reagents.db" "C:\Backups\reagents-backup.db"
```

**Scheduled Backup (Task Scheduler):**
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily
4. Action: Start a program
5. Program: `powershell.exe`
6. Arguments:
```powershell
-Command "Copy-Item '$env:LOCALAPPDATA\reagent-expiry-tracker\reagents.db' 'C:\Backups\reagents-$(Get-Date -Format yyyy-MM-dd).db'"
```

---

## Deployment to Multiple Workstations

### Option 1: MSI via Group Policy

1. Build MSI installer
2. Copy to network share
3. Deploy via Group Policy:
   - Computer Configuration > Software Settings > Software Installation
   - Right-click > New > Package
   - Select the MSI file

### Option 2: SCCM/Intune

1. Package the MSI
2. Deploy via SCCM or Intune
3. Install command:
```powershell
msiexec /i "Reagent Expiry Tracker_1.0.0_x64_en-US.msi" /quiet /norestart
```

### Option 3: Manual Network Install

1. Copy installer to network share
2. Send email to users with install link
3. Users double-click to install

**Each user gets their own database** (stored in their user profile)

---

## Uninstalling

### Remove the App

**Via Settings:**
1. Settings > Apps > Installed Apps
2. Find "Reagent Expiry Tracker"
3. Click Uninstall

**Via PowerShell:**
```powershell
# Find the product code
Get-WmiObject Win32_Product | Where-Object { $_.Name -like "*Reagent*" }

# Uninstall
msiexec /x {PRODUCT-CODE} /quiet
```

### Remove Data

Database is NOT removed during uninstall (to prevent accidental data loss).

**To remove manually:**
```powershell
Remove-Item -Recurse "$env:LOCALAPPDATA\reagent-expiry-tracker"
```

---

## FAQ

**Q: Will this work on Windows 10?**
A: Yes, but WebView2 must be installed manually.

**Q: Can multiple people use the same database?**
A: Not recommended. Each user should have their own database. For shared data, consider network drive (future feature).

**Q: Does this need admin rights?**
A: Installation needs admin (MSI installer). Running the app does NOT need admin.

**Q: Can I run this on Windows Server?**
A: Yes, but install Desktop Experience role for WebView2.

**Q: How much disk space needed?**
A: ~50MB for app, ~1-10MB for database (depending on data)

**Q: Will my antivirus block it?**
A: Might flag during development. Production installer is safe. Whitelist if needed.

---

## Getting Help

### Error Messages

If you get errors, check:
1. Windows Event Viewer (Application logs)
2. Console output (if running from terminal)
3. Database file permissions

### Performance Issues

- Close app fully and restart
- Check disk space (need ~100MB free)
- Restart Windows
- Check for Windows updates

### Contact Support

[Add your support contact here]

---

**מדריך זה עודכן עבור Windows 10/11** | This guide is for Windows 10/11
