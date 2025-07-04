#!/bin/bash

# Front-end Integration Update Script
# This script helps integrate the SOL VM communication solution

echo "🚀 Updating front-end for SOL VM integration..."

# Check if required dependencies are installed
echo "📦 Checking dependencies..."

# Add any missing UI components if needed
if ! grep -q "@radix-ui/react-switch" package.json; then
    echo "Installing missing UI dependencies..."
    npm install @radix-ui/react-switch
fi

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local from template..."
    cp .env.example .env.local
    echo "⚠️  Please update .env.local with your actual API URLs and credentials"
fi

# Build the project to check for errors
echo "🔨 Building project to check for errors..."
npm run build 2>&1 | tee build.log

if [ $? -eq 0 ]; then
    echo "✅ Build successful! SOL VM integration is ready."
    echo ""
    echo "📖 Next steps:"
    echo "1. Update .env.local with your message queue API URLs"
    echo "2. Deploy the message queue API (message_queue_api.py)"
    echo "3. Set up the SOL VM poller using deploy_sol_vm.sh"
    echo "4. Test the integration using the Settings tab in your app"
else
    echo "❌ Build failed. Check build.log for details."
    echo "Common issues:"
    echo "- Missing dependencies: npm install"
    echo "- TypeScript errors: Check component imports"
    echo "- Environment variables: Update .env.local"
fi

echo ""
echo "🔧 Available commands:"
echo "  npm run dev          - Start development server"
echo "  npm run build        - Build for production"
echo "  npm run test         - Run tests"
echo ""
echo "📚 Documentation:"
echo "  See SOL_VM_COMMUNICATION_GUIDE.md for complete setup instructions"
