@echo off
REM Build script for Windows Desktop Application
REM This creates a production-ready installer

echo ========================================
echo Building Reagent Expiry Tracker
echo Desktop Application for Windows
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "src-tauri" (
    echo ERROR: Please run this script from apps/desktop directory
    pause
    exit /b 1
)

echo [1/5] Checking Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please download and install from: https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js found

echo.
echo [2/5] Checking Rust...
where cargo >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Rust is not installed!
    echo Please download and install from: https://rustup.rs/
    pause
    exit /b 1
)
echo ✓ Rust found

echo.
echo [3/5] Installing dependencies...
cd ..\..
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
cd apps\desktop

echo.
echo [4/5] Building frontend...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)
echo ✓ Frontend built successfully

echo.
echo [5/5] Building Tauri application...
echo This may take 10-15 minutes on first build...
call npm run tauri build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Tauri build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✓ BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Installer files are located in:
echo   src-tauri\target\release\bundle\msi\
echo   src-tauri\target\release\bundle\nsis\
echo.
echo You can now distribute these files to users!
echo.
pause
