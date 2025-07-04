@echo off
REM GitHub Repository Secrets Setup Helper (Windows)
REM This script helps you set up the required secrets for GitHub Actions deployment

echo.
echo 🔧 GitHub Actions Deployment Setup Helper
echo ==========================================
echo.

REM Check if GitHub CLI is installed
gh --version >nul 2>&1
if errorlevel 1 (
    echo ❌ GitHub CLI ^(gh^) is not installed.
    echo Please install it from: https://cli.github.com/
    echo Then run: gh auth login
    pause
    exit /b 1
)

REM Check if user is authenticated
gh auth status >nul 2>&1
if errorlevel 1 (
    echo ❌ Not authenticated with GitHub CLI.
    echo Please run: gh auth login
    pause
    exit /b 1
)

echo ✅ GitHub CLI is installed and authenticated
echo.

REM Get repository information
for /f "tokens=*" %%a in ('gh repo view --json owner,name -q ".owner.login + \"/\" + .name"') do set REPO=%%a
echo 📁 Repository: %REPO%
echo.

REM Check for .env.production
if exist ".env.production" (
    echo 📋 Found .env.production file
    echo.
    echo 🔧 Setting up secrets from .env.production...
    echo.
    
    REM Read and set secrets from .env.production
    for /f "usebackq tokens=1,2 delims==" %%a in (".env.production") do (
        if not "%%a"=="" if not "%%a:~0,1%"=="#" (
            echo 🔐 Setting secret: %%a
            echo %%b | gh secret set %%a
            if not errorlevel 1 (
                echo ✅ Secret %%a set successfully
            ) else (
                echo ❌ Failed to set secret %%a
            )
            echo.
        )
    )
) else (
    echo ⚠️  .env.production file not found
    echo Please create this file with your environment variables first.
    echo.
)

echo 🌐 Optional Deployment Platform Setup
echo You can set up additional deployment platforms:
echo.

echo 1. Netlify ^(optional^):
echo    - Go to Netlify → User settings → Applications → Personal access tokens
echo    - Create a new token and run:
echo    gh secret set NETLIFY_AUTH_TOKEN
echo    gh secret set NETLIFY_SITE_ID
echo.

echo 2. Vercel ^(optional^):
echo    - Go to Vercel → Settings → Tokens
echo    - Create a new token and run:
echo    gh secret set VERCEL_TOKEN
echo    gh secret set VERCEL_ORG_ID
echo    gh secret set VERCEL_PROJECT_ID
echo.

echo 3. Custom Domain ^(optional^):
echo    - For GitHub Pages custom domain:
echo    gh secret set CUSTOM_DOMAIN
echo.

REM Enable GitHub Pages
echo 📄 Enabling GitHub Pages...
gh api repos/%REPO% --method PATCH --field has_pages=true

echo.
echo ✅ Setup completed!
echo.
echo 🚀 Next Steps:
echo 1. Push your changes to the main branch
echo 2. Go to Actions tab to see the deployment workflow
echo 3. Check Settings → Pages for your deployment URL
echo.
echo 🔗 View your workflows:
echo https://github.com/%REPO%/actions
echo.
pause
