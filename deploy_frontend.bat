@echo off
REM Deploy Frontend for SOL VM Communication
REM This script builds and prepares the frontend for deployment

echo.
echo 🚀 Deploying Tutokenized Simulator Frontend for SOL VM
echo =================================================
echo.

REM Check if production environment file exists
if not exist ".env.production" (
    echo ❌ .env.production file not found!
    echo    Please create .env.production with your deployed service URLs
    pause
    exit /b 1
)

echo 📋 Current Configuration:
for /f "tokens=2 delims==" %%a in ('findstr VITE_EXECUTOR_TYPE .env.production') do echo    Executor Type: %%a
for /f "tokens=2 delims==" %%a in ('findstr VITE_TASK_QUEUE_URL .env.production') do echo    Task Queue URL: %%a
for /f "tokens=2 delims==" %%a in ('findstr VITE_RESULT_QUEUE_URL .env.production') do echo    Result Queue URL: %%a
echo.

REM Install dependencies
echo 📦 Installing dependencies...
npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Copy production environment
echo 🔧 Setting up production environment...
copy .env.production .env.local >nul

REM Build for production
echo 🏗️ Building for production...
npm run build
if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo.
echo ✅ Frontend built successfully!
echo.
echo 📂 Deployment Options:
echo.
echo 🌐 Option 1: Deploy to Vercel
echo    1. npm install -g vercel
echo    2. vercel --prod
echo.
echo 🌐 Option 2: Deploy to Netlify
echo    1. npm install -g netlify-cli
echo    2. netlify deploy --prod --dir=dist
echo.
echo 🌐 Option 3: Deploy to Render
echo    1. Push to GitHub
echo    2. Connect repository to Render
echo    3. Set build command: npm run build
echo    4. Set publish directory: dist
echo.
echo 🌐 Option 4: Deploy to GitHub Pages
echo    1. git add dist ^&^& git commit -m "Deploy"
echo    2. git subtree push --prefix dist origin gh-pages
echo.
echo 🔧 Environment Variables for Deployment:
echo    VITE_EXECUTOR_TYPE=hybrid
echo    VITE_TASK_QUEUE_URL=https://tutokenized-queue-api.onrender.com/tasks
echo    VITE_RESULT_QUEUE_URL=https://tutokenized-queue-api.onrender.com/results
echo    VITE_API_KEY=T_pPqciDqdEuPgBFZEsO8Fx7mPxVuhhXL9sai3sztaU
echo.
echo 🎯 After deployment, test the connection:
echo    - Open your deployed frontend URL
echo    - Go to Debug tab
echo    - Click 'Test Connection'
echo    - Should show: 'SOL VM executor is healthy'
echo.
pause
