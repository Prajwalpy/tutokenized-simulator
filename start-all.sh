#!/bin/bash

# Complete startup script for Tutokenized Simulator with local execution

echo "🚀 Starting Tutokenized Simulator with Local Execution"
echo "=================================================="

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $EXECUTOR_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    wait
    echo "✅ All services stopped"
    exit 0
}

# Trap signals for cleanup
trap cleanup SIGINT SIGTERM

# Start the local executor service
echo "📦 Starting Local Executor Service..."
SCRIPT_DIR="$(dirname "$0")"
cd "$SCRIPT_DIR"

# Check if local-executor dependencies are installed
if [ ! -d "local-executor/node_modules" ]; then
    echo "📥 Installing executor dependencies..."
    cd local-executor && npm install && cd "$SCRIPT_DIR"
fi

# Start executor service in background
cd local-executor && npm start &
EXECUTOR_PID=$!
cd "$SCRIPT_DIR"

# Wait a moment for the service to start
sleep 3

# Check if executor service is running
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ Failed to start executor service"
    cleanup
fi

echo "✅ Executor service running on http://localhost:3001"

# Check if frontend dependencies are installed
cd "$SCRIPT_DIR"  # Ensure we're in the main project directory
if [ ! -d "node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    npm install
fi

# Start frontend (make sure we're in the right directory)
echo "🌐 Starting Frontend..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 Tutokenized Simulator is ready!"
echo "=================================="
echo ""
echo "📍 Frontend:  http://localhost:5173 (or http://localhost:3000)"
echo "🔧 Executor:  http://localhost:3001"
echo ""
echo "💡 Tips:"
echo "   • Write Python code in the editor"
echo "   • Click 'Run Code' to execute instantly"
echo "   • Check the Debug panel for results"
echo "   • Use 'Test Connection' to verify the executor service"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for processes
wait
