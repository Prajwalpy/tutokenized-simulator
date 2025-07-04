#!/bin/bash
# GitHub Repository Secrets Setup Helper
# This script helps you set up the required secrets for GitHub Actions deployment

echo "🔧 GitHub Actions Deployment Setup Helper"
echo "=========================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed.${NC}"
    echo "Please install it from: https://cli.github.com/"
    echo "Then run: gh auth login"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI.${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI is installed and authenticated${NC}"
echo

# Get repository information
REPO=$(gh repo view --json owner,name -q '.owner.login + "/" + .name')
echo -e "${BLUE}📁 Repository: $REPO${NC}"
echo

# Read current .env.production values
if [ -f ".env.production" ]; then
    echo -e "${GREEN}📋 Found .env.production file${NC}"
    source .env.production
else
    echo -e "${YELLOW}⚠️  .env.production file not found${NC}"
    echo "Creating example values..."
fi

# Function to set secret
set_secret() {
    local key=$1
    local value=$2
    local description=$3
    
    if [ -n "$value" ]; then
        echo -e "${BLUE}🔐 Setting secret: $key${NC}"
        echo "$value" | gh secret set "$key"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Secret $key set successfully${NC}"
        else
            echo -e "${RED}❌ Failed to set secret $key${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Skipping $key (no value provided)${NC}"
        echo "   Description: $description"
    fi
    echo
}

# Set secrets from .env.production
echo -e "${YELLOW}🔧 Setting up secrets from .env.production...${NC}"
echo

set_secret "VITE_EXECUTOR_TYPE" "$VITE_EXECUTOR_TYPE" "Executor type (hybrid/local)"
set_secret "VITE_TASK_QUEUE_URL" "$VITE_TASK_QUEUE_URL" "Task queue API URL"
set_secret "VITE_RESULT_QUEUE_URL" "$VITE_RESULT_QUEUE_URL" "Result queue API URL"
set_secret "VITE_API_KEY" "$VITE_API_KEY" "API key for queue authentication"
set_secret "VITE_LOCAL_EXECUTOR_URL" "$VITE_LOCAL_EXECUTOR_URL" "Local executor URL"
set_secret "VITE_BACKEND_URL" "$VITE_BACKEND_URL" "SOL VM backend URL"
set_secret "VITE_MAX_RETRIES" "$VITE_MAX_RETRIES" "Maximum retry attempts"
set_secret "VITE_RETRY_DELAY" "$VITE_RETRY_DELAY" "Retry delay in ms"
set_secret "VITE_POLL_INTERVAL" "$VITE_POLL_INTERVAL" "Polling interval in ms"
set_secret "VITE_EXECUTION_TIMEOUT" "$VITE_EXECUTION_TIMEOUT" "Execution timeout in seconds"
set_secret "VITE_DEBUG_MODE" "$VITE_DEBUG_MODE" "Enable debug mode"
set_secret "VITE_AUTO_REFRESH_STATUS" "$VITE_AUTO_REFRESH_STATUS" "Auto refresh status"

# Optional deployment platform setup
echo -e "${YELLOW}🌐 Optional Deployment Platform Setup${NC}"
echo "You can set up additional deployment platforms:"
echo

echo -e "${BLUE}1. Netlify (optional):${NC}"
echo "   - Go to Netlify → User settings → Applications → Personal access tokens"
echo "   - Create a new token and run:"
echo "   gh secret set NETLIFY_AUTH_TOKEN"
echo "   gh secret set NETLIFY_SITE_ID"
echo

echo -e "${BLUE}2. Vercel (optional):${NC}"
echo "   - Go to Vercel → Settings → Tokens"
echo "   - Create a new token and run:"
echo "   gh secret set VERCEL_TOKEN"
echo "   gh secret set VERCEL_ORG_ID"
echo "   gh secret set VERCEL_PROJECT_ID"
echo

echo -e "${BLUE}3. Custom Domain (optional):${NC}"
echo "   - For GitHub Pages custom domain:"
echo "   gh secret set CUSTOM_DOMAIN"
echo

# Enable GitHub Pages
echo -e "${YELLOW}📄 Enabling GitHub Pages...${NC}"
gh api repos/$REPO --method PATCH --field has_pages=true

echo -e "${GREEN}✅ Setup completed!${NC}"
echo
echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo "1. Push your changes to the main branch"
echo "2. Go to Actions tab to see the deployment workflow"
echo "3. Check Settings → Pages for your deployment URL"
echo
echo -e "${BLUE}🔗 View your workflows:${NC}"
echo "https://github.com/$REPO/actions"
