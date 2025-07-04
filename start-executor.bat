@echo off
REM Windows startup script for the Tutokenized Simulator Local Executor

echo 🚀 Starting Tutokenized Simulator Local Executor...

REM Navigate to local-executor directory
cd /d "%~dp0local-executor"

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        echo    Make sure Node.js is installed and try again
        pause
        exit /b 1
    )
)

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    python3 --version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Error: Python is not installed or not in PATH
        echo    Please install Python 3.x and add it to your PATH
        echo    Download from: https://python.org/downloads/
        pause
        exit /b 1
    ) else (
        echo ✅ Python 3 found
        python3 --version
    )
) else (
    echo ✅ Python found
    python --version
)

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js is not installed or not in PATH
    echo    Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✅ Node.js found
    node --version
)

echo.
echo 🎯 Starting local executor server on http://localhost:3001...
echo    The server will check Python availability automatically
echo    Press Ctrl+C to stop the server
echo.

REM Start the server
npm start

echo.
echo 🛑 Server stopped.
pause
