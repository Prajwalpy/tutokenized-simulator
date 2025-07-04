#!/bin/bash

# Simple startup script for VM environment
echo "🚀 Starting Tutokenized Simulator Local Execution"
echo "================================================"

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    if [ ! -z "$EXECUTOR_PID" ]; then
        kill $EXECUTOR_PID 2>/dev/null
        wait $EXECUTOR_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        wait $FRONTEND_PID 2>/dev/null
    fi
    echo "✅ All services stopped"
    exit 0
}

# Trap signals for cleanup
trap cleanup SIGINT SIGTERM

echo "🔧 Starting Local Python Executor Service..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js to continue."
    exit 1
fi

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python3 to continue."
    exit 1
fi

# Install executor dependencies if needed
cd local-executor
if [ ! -d "node_modules" ]; then
    echo "📦 Installing executor dependencies..."
    npm install
fi

# Start executor service
echo "🚀 Starting executor on http://localhost:3001..."
node server.js &
EXECUTOR_PID=$!

# Wait a moment for the service to start
sleep 2

# Check if executor is running
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Local executor service is running!"
else
    echo "❌ Failed to start local executor service"
    cleanup
fi

cd ..

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start frontend
echo "🌐 Starting frontend on http://localhost:5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 Tutokenized Simulator is ready!"
echo "=================================="
echo ""
echo "📍 Frontend:  http://localhost:5173"
echo "🔧 Executor:  http://localhost:3001"
echo ""
echo "💡 Usage:"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Write Python code in the editor"
echo "   3. Click 'Run Code' to execute locally"
echo "   4. View output in the Debug tab"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for services
wait
