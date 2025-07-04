@echo off
REM Test script to verify the Tutokenized Simulator setup

echo.
echo =======================================
echo   Tutokenized Simulator - System Test
echo =======================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Not in project directory
    exit /b 1
)

echo 🔍 Testing Prerequisites...

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js: Not found
    set PREREQ_FAILED=1
) else (
    echo ✅ Node.js: Available
)

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    python3 --version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Python: Not found
        set PREREQ_FAILED=1
    ) else (
        echo ✅ Python: Available (python3)
    )
) else (
    echo ✅ Python: Available (python)
)

REM Check dependencies
if exist "node_modules" (
    echo ✅ Main dependencies: Installed
) else (
    echo ⚠️  Main dependencies: Not installed (run npm install)
)

if exist "local-executor\node_modules" (
    echo ✅ Executor dependencies: Installed
) else (
    echo ⚠️  Executor dependencies: Not installed
)

echo.
echo 🧪 Testing Services...

REM Test if executor can start
echo 📋 Checking executor server...
cd local-executor
start /min /wait timeout 1
node -e "const express = require('express'); console.log('✅ Express available');" 2>nul
if errorlevel 1 (
    echo ❌ Express not available in executor
) else (
    echo ✅ Executor dependencies OK
)
cd ..

REM Test if main project can start
echo 📋 Checking main project...
npm run build --dry-run >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Build check: Some issues (may still work)
) else (
    echo ✅ Build check: OK
)

echo.
echo 📊 Test Summary:
echo ================

if defined PREREQ_FAILED (
    echo ❌ Prerequisites: FAILED - Install missing software
    echo.
    echo 📥 Download links:
    echo    Node.js: https://nodejs.org/
    echo    Python:  https://python.org/downloads/
) else (
    echo ✅ Prerequisites: PASSED
)

if exist "node_modules" if exist "local-executor\node_modules" (
    echo ✅ Dependencies: READY
    echo.
    echo 🚀 Ready to run! Use one of these commands:
    echo    quick-start.bat       - One-click setup
    echo    start-executor.bat    - Just the executor
    echo    npm run dev           - Just the frontend
) else (
    echo ⚠️  Dependencies: INCOMPLETE
    echo.
    echo 🔧 To fix: Run these commands:
    echo    npm install
    echo    cd local-executor
    echo    npm install
    echo    cd ..
)

echo.
pause
