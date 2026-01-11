@echo off
REM Quick Desktop Build Script - Simplified

echo Building Desktop App (Frontend only)...
cd apps\desktop

echo Installing dependencies...
npm install

echo Building frontend...
npm run build

echo.
echo ========================================
echo Frontend build complete!
echo ========================================
echo.
echo The built files are in: apps\desktop\dist\
echo.
echo NOTE: Full .exe/.msi build requires Rust and Windows
echo For full installer, you need to run on Windows with Rust installed
echo.
pause
