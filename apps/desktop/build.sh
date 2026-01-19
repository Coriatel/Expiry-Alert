#!/bin/bash
# Build script for Linux/Mac Desktop Application

echo "========================================"
echo "Building Reagent Expiry Tracker"
echo "Desktop Application"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -d "src-tauri" ]; then
    echo "ERROR: Please run this script from apps/desktop directory"
    exit 1
fi

echo "[1/5] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please download and install from: https://nodejs.org/"
    exit 1
fi
echo "✓ Node.js found"

echo ""
echo "[2/5] Checking Rust..."
if ! command -v cargo &> /dev/null; then
    echo "ERROR: Rust is not installed!"
    echo "Please download and install from: https://rustup.rs/"
    exit 1
fi
echo "✓ Rust found"

echo ""
echo "[3/5] Installing dependencies..."
cd ../..
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi
cd apps/desktop

echo ""
echo "[4/5] Building frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Frontend build failed"
    exit 1
fi
echo "✓ Frontend built successfully"

echo ""
echo "[5/5] Building Tauri application..."
echo "This may take 10-15 minutes on first build..."
npm run tauri:build
if [ $? -ne 0 ]; then
    echo "ERROR: Tauri build failed"
    exit 1
fi

echo ""
echo "========================================"
echo "✓ BUILD COMPLETED SUCCESSFULLY!"
echo "========================================"
echo ""
echo "Installer files are located in:"
echo "  src-tauri/target/release/bundle/"
echo ""
echo "You can now distribute these files to users!"
echo ""
