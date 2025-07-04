#!/bin/bash

echo "🚀 Deploying Tutokenized Queue API to Render"
echo "============================================"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📝 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit for deployment"
fi

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Committing latest changes..."
    git add .
    git commit -m "Update for Render deployment"
fi

echo ""
echo "✅ Code is ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Push this repository to GitHub:"
echo "   git remote add origin https://github.com/yourusername/tutokenized-simulator.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "2. Go to https://render.com and:"
echo "   - Sign up/Login with GitHub"
echo "   - Click 'New +' → 'Web Service'"
echo "   - Connect your GitHub repository"
echo "   - Use these settings:"
echo "     • Build Command: pip install -r requirements.txt"
echo "     • Start Command: python message_queue_api.py"
echo "     • Environment Variables:"
echo "       - API_KEY: T_pPqciDqdEuPgBFZEsO8Fx7mPxVuhhXL9sai3sztaU"
echo "       - PORT: 10000"
echo ""
echo "3. After deployment, update your .env.local file with the actual Render URL"
echo ""
echo "🎯 Your message_queue_api.py is configured and ready!"
