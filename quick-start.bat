@echo off
REM Quick Start - Tutokenized Simulator

echo.
echo =============================================
echo    Tutokenized Simulator - Quick Start
echo =============================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found
    echo    Please run this script from the project root directory
    pause
    exit /b 1
)

if not exist "local-executor" (
    echo ❌ Error: local-executor directory not found
    echo    Please make sure you're in the correct project directory
    pause
    exit /b 1
)

echo 🔍 Checking prerequisites...

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js from https://nodejs.org/
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
        echo ❌ Python not found. Please install Python 3 from https://python.org/
        pause
        exit /b 1
    ) else (
        echo ✅ Python 3 found
    )
) else (
    echo ✅ Python found
)

echo.
echo 🔧 Setting up services...

REM Install main dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing main project dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install main dependencies
        pause
        exit /b 1
    )
)

REM Install executor dependencies if needed
cd local-executor
if not exist "node_modules" (
    echo 📦 Installing executor dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install executor dependencies
        pause
        exit /b 1
    )
)
cd ..

REM Create .env.local if it doesn't exist
if not exist ".env.local" (
    echo 📝 Creating .env.local from template...
    copy ".env.example" ".env.local" >nul 2>&1
    if not exist ".env.local" (
        echo # Tutokenized Simulator Configuration > .env.local
        echo VITE_EXECUTOR_TYPE=local >> .env.local
        echo VITE_LOCAL_EXECUTOR_URL=http://localhost:3001 >> .env.local
    )
    echo ⚠️  Note: .env.local created with default values
)

echo.
echo 🚀 Starting services...

REM Start the executor in a new window
echo 📦 Starting Local Python Executor...
start "Tutokenized Local Executor" /min cmd /c "cd /d \"%~dp0\" && start-executor.bat"

REM Wait for executor to start
echo ⏳ Waiting for executor to start...
timeout /t 8 /nobreak >nul

REM Check if executor is running
echo 🔍 Checking executor status...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/health' -UseBasicParsing -TimeoutSec 3; if ($response.StatusCode -eq 200) { Write-Host '✅ Executor is running on http://localhost:3001' -ForegroundColor Green; exit 0 } else { exit 1 } } catch { Write-Host '⚠️  Executor might still be starting...' -ForegroundColor Yellow; exit 1 }"

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
echo    5. Use 'Test Connection' button if needed
echo.
echo ⚠️  To stop: Close this window or press Ctrl+C
echo.

REM Start frontend and open browser
echo 🌐 Launching development server...
timeout /t 2 /nobreak >nul
start "" "http://localhost:5173"

REM Start the development server (this keeps the window open)
npm run dev

echo.
echo 🛑 Services stopped.
pause
