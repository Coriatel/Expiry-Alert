@echo off
REM Build script for Android APK

echo ========================================
echo Building Reagent Expiry Tracker
echo Android Application (APK)
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "app.json" (
    echo ERROR: Please run this script from apps/mobile directory
    pause
    exit /b 1
)

echo [1/4] Checking Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please download and install from: https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js found

echo.
echo [2/4] Installing dependencies...
cd ..\..
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
cd apps\mobile

echo.
echo [3/4] Prebuild Android project...
call npx expo prebuild --platform android --clean
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Prebuild failed
    pause
    exit /b 1
)

echo.
echo [4/4] Building APK...
echo This may take 15-20 minutes on first build...
cd android
call gradlew.bat assembleRelease
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: APK build failed
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo ✓ BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo APK file is located at:
echo   android\app\build\outputs\apk\release\app-release.apk
echo.
echo You can now distribute this file to users!
echo.
echo To install on device:
echo   adb install android\app\build\outputs\apk\release\app-release.apk
echo.
pause
