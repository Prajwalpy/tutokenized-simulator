#!/bin/bash

# Startup script for the local Python executor

echo "🚀 Starting Tutokenized Simulator Local Executor..."

# Navigate to local-executor directory
cd "$(dirname "$0")/local-executor"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if Python is available
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 found: $(python3 --version)"
elif command -v python &> /dev/null; then
    echo "⚠️  Python 3 not found, but python is available: $(python --version)"
    echo "   You may need to adjust the server.js to use 'python' instead of 'python3'"
else
    echo "❌ Error: Python is not installed or not in PATH"
    echo "   Please install Python 3.x and try again"
    exit 1
fi

echo "🎯 Starting local executor server..."
npm start
