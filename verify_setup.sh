#!/bin/bash

# Verification script for Tutokenized Simulator setup

echo "🔍 Tutokenized Simulator - Setup Verification"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo "❌ Please run this script from the tutokenized-simulator root directory"
    exit 1
fi

echo ""
echo "📦 Checking Frontend Dependencies..."
if [ -f "package.json" ]; then
    echo "✓ package.json found"
    if [ -d "node_modules" ]; then
        echo "✓ node_modules directory exists"
    else
        echo "⚠️  node_modules not found - run 'npm install'"
    fi
else
    echo "❌ package.json not found"
fi

echo ""
echo "🐍 Checking Backend Dependencies..."
if [ -f "backend/requirements.txt" ]; then
    echo "✓ backend/requirements.txt found"
    if [ -d "backend/venv" ]; then
        echo "✓ backend virtual environment exists"
        
        # Check if main dependencies are installed
        if backend/venv/bin/pip list | grep -q "fastapi"; then
            echo "✓ FastAPI is installed"
        else
            echo "⚠️  FastAPI not found - run 'cd backend && ./setup.sh'"
        fi
    else
        echo "⚠️  backend/venv not found - run 'cd backend && ./setup.sh'"
    fi
else
    echo "❌ backend/requirements.txt not found"
fi

echo ""
echo "📁 Checking Project Structure..."
declare -a required_files=(
    "src/config/backend.ts"
    "src/components/CodeEditor.tsx"
    "src/components/Debug.tsx"
    "backend/main.py"
    "backend/setup.sh"
    "backend/start.sh"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file"
    else
        echo "❌ $file missing"
    fi
done

echo ""
echo "🔧 Configuration Check..."
if grep -q "DEFAULT_URL.*localhost" src/config/backend.ts; then
    echo "⚠️  Backend is configured for localhost"
    echo "   Update src/config/backend.ts with your Sol VM IP for remote deployment"
else
    echo "✓ Backend URL configured"
fi

echo ""
echo "🚀 Next Steps:"
echo ""
echo "For Local Development:"
echo "  1. Start backend: cd backend && ./start.sh"
echo "  2. Start frontend: npm run dev"
echo "  3. Open http://localhost:8080"
echo ""
echo "For Remote Sol VM Deployment:"
echo "  1. Copy backend/ to your Sol VM"
echo "  2. SSH to Sol VM and run: cd backend && ./setup.sh && ./start.sh"
echo "  3. Update src/config/backend.ts with Sol VM IP"
echo "  4. Start frontend: npm run dev"
echo ""
echo "📚 Documentation:"
echo "  - Backend: backend/README.md"
echo "  - Deployment: backend/DEPLOYMENT.md"
echo "  - Full Guide: PROJECT_README.md"
echo ""
echo "🧪 Testing:"
echo "  - Backend: cd backend && ./test_backend.sh"
echo "  - Frontend: Open Debug tab and test connection"
