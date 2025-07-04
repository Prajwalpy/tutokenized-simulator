@echo off
REM Complete startup script for Windows - starts both executor and frontend

echo 🚀 Starting Tutokenized Simulator (Complete Setup)...
echo ====================================================

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM Function to cleanup processes on exit
set EXECUTOR_PID=
set FRONTEND_PID=

REM Check prerequisites
echo 📋 Checking prerequisites...

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js to continue.
    pause
    exit /b 1
) else (
    echo ✅ Node.js found
)

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    python3 --version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Python not found. Please install Python 3 to continue.
        pause
        exit /b 1
    ) else (
        echo ✅ Python 3 found
    )
) else (
    echo ✅ Python found
)

REM Install executor dependencies if needed
echo.
echo 🔧 Setting up Local Executor...
cd /d "%SCRIPT_DIR%local-executor"
if not exist "node_modules" (
    echo 📦 Installing executor dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install executor dependencies
        pause
        exit /b 1
    )
)

REM Start executor service in background
echo 🚀 Starting executor on http://localhost:3001...
start "Local Executor" /min cmd /c "npm start"

REM Wait a moment for the service to start
timeout /t 3 /nobreak >nul

REM Check if executor is running
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:3001/health' -UseBasicParsing -TimeoutSec 5 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo ❌ Failed to start local executor service
    echo    Please check if port 3001 is available
    pause
    exit /b 1
) else (
    echo ✅ Local executor service is running!
)

REM Go back to main directory
cd /d "%SCRIPT_DIR%"

REM Install frontend dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing frontend dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

REM Create .env.local if it doesn't exist
if not exist ".env.local" (
    echo 📝 Creating .env.local from template...
    copy ".env.example" ".env.local" >nul
    echo ⚠️  Note: .env.local created with default values
    echo    Update it with your actual API URLs if using remote execution
)

echo.
echo 🌐 Starting Frontend...
echo.
echo 🎉 Tutokenized Simulator is ready!
echo ==================================
echo.
echo 📍 Frontend:  http://localhost:5173 (will open automatically)
echo 🔧 Executor:  http://localhost:3001
echo.
echo 💡 Usage:
echo    1. The browser will open automatically
echo    2. Write Python code in the editor
echo    3. Click 'Run Code' to execute locally
echo    4. View output in the Debug tab
echo.
echo ⚠️  To stop: Close this window or press Ctrl+C
echo.

REM Start frontend and open browser
start "Frontend" npm run dev
timeout /t 5 /nobreak >nul
start http://localhost:5173

echo 📖 Services are running. Check the opened browser window.
echo 🛑 Press any key to stop all services...
pause >nul

REM Cleanup - kill processes
taskkill /f /im "node.exe" >nul 2>&1
echo.
echo 🛑 Services stopped. Goodbye!
pause
