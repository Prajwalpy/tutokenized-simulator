# Tutokenized Simulator - PowerShell Quick Start
# Simple PowerShell script to start the simulator

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Tutokenized Simulator - PowerShell Start" -ForegroundColor Cyan  
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found" -ForegroundColor Red
    Write-Host "   Please run this script from the project root directory" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Python
try {
    $pythonVersion = python --version 2>$null
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    try {
        $pythonVersion = python3 --version 2>$null
        Write-Host "✅ Python 3 found: $pythonVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Python not found. Please install from https://python.org/" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "🔧 Setting up dependencies..." -ForegroundColor Yellow

# Install main dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing main dependencies..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install main dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Install executor dependencies
Set-Location "local-executor"
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing executor dependencies..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install executor dependencies" -ForegroundColor Red
        Set-Location ".."
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Set-Location ".."

Write-Host ""
Write-Host "🚀 Starting services..." -ForegroundColor Yellow

# Start executor in background
Write-Host "📦 Starting Local Python Executor..." -ForegroundColor Cyan
$executorJob = Start-Job -ScriptBlock {
    Set-Location $args[0]
    Set-Location "local-executor"
    node server.js
} -ArgumentList (Get-Location)

# Wait for executor to start
Write-Host "⏳ Waiting for executor to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check executor health
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Executor is running on http://localhost:3001" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Executor might still be starting..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🌐 Starting Frontend..." -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Tutokenized Simulator is ready!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "🔧 Executor:  http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "💡 The browser will open automatically" -ForegroundColor Cyan
Write-Host "   Write Python code and click 'Run Code' to test!" -ForegroundColor Cyan
Write-Host ""
Write-Host "🛑 Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Open browser
Start-Process "http://localhost:5173"

# Start frontend (this will block)
npm run dev

# Cleanup when frontend stops
Write-Host ""
Write-Host "🛑 Stopping services..." -ForegroundColor Yellow
Stop-Job $executorJob -Force
Remove-Job $executorJob -Force
Write-Host "✅ All services stopped." -ForegroundColor Green
