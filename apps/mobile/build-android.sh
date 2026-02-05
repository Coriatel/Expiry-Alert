#!/bin/bash
# Build script for Android APK

echo "========================================"
echo "Building Reagent Expiry Tracker"
echo "Android Application (APK)"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "app.json" ]; then
    echo "ERROR: Please run this script from apps/mobile directory"
    exit 1
fi

echo "[1/4] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please download and install from: https://nodejs.org/"
    exit 1
fi
echo "✓ Node.js found"

echo ""
echo "[2/4] Installing dependencies..."
cd ../..
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi
cd apps/mobile

echo ""
echo "[3/4] Prebuild Android project..."
npx expo prebuild --platform android --clean
if [ $? -ne 0 ]; then
    echo "ERROR: Prebuild failed"
    exit 1
fi

echo ""
echo "[4/4] Building APK..."
echo "This may take 15-20 minutes on first build..."
cd android
./gradlew assembleRelease
if [ $? -ne 0 ]; then
    echo "ERROR: APK build failed"
    exit 1
fi
cd ..

echo ""
echo "========================================"
echo "✓ BUILD COMPLETED SUCCESSFULLY!"
echo "========================================"
echo ""
echo "APK file is located at:"
echo "  android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "You can now distribute this file to users!"
echo ""
echo "To install on device:"
echo "  adb install android/app/build/outputs/apk/release/app-release.apk"
echo ""
