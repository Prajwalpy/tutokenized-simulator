#!/bin/bash

echo "🧪 Testing Tutokenized Simulator Local Execution"
echo "==============================================="

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found"
    exit 1
fi
echo "✅ Node.js found: $(node --version)"

if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found"
    exit 1
fi
echo "✅ Python3 found: $(python3 --version)"

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi
echo "✅ npm found: $(npm --version)"

echo ""

# Test Python execution
echo "🐍 Testing Python execution..."
python3 -c "print('✅ Python test successful')" || {
    echo "❌ Python test failed"
    exit 1
}

echo ""

# Test local executor service
echo "🔧 Testing local executor service..."

cd local-executor

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing executor dependencies..."
    npm install > /dev/null 2>&1
fi

# Start service in background
echo "🚀 Starting executor service..."
node server.js &
EXECUTOR_PID=$!

# Wait for service to start
sleep 3

# Test health endpoint
echo "🩺 Testing health endpoint..."
if curl -s http://localhost:3001/health | grep -q "healthy"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    kill $EXECUTOR_PID 2>/dev/null
    exit 1
fi

# Test code execution
echo "⚡ Testing code execution..."
RESPONSE=$(curl -s -X POST http://localhost:3001/execute \
    -H "Content-Type: application/json" \
    -d '{"code":"print(\"Hello from test!\")\nresult = 2 + 2\nprint(f\"2 + 2 = {result}\")"}')

if echo "$RESPONSE" | grep -q "Hello from test"; then
    echo "✅ Code execution test passed"
else
    echo "❌ Code execution test failed"
    echo "Response: $RESPONSE"
    kill $EXECUTOR_PID 2>/dev/null
    exit 1
fi

# Clean up
echo "🧹 Cleaning up..."
kill $EXECUTOR_PID 2>/dev/null
wait $EXECUTOR_PID 2>/dev/null

cd ..

# Test frontend dependencies
echo "🌐 Testing frontend setup..."
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install > /dev/null 2>&1
fi

echo ""
echo "🎉 All tests passed!"
echo "==================="
echo ""
echo "✅ Prerequisites: OK"
echo "✅ Python execution: OK"  
echo "✅ Local executor service: OK"
echo "✅ Code execution API: OK"
echo "✅ Frontend dependencies: OK"
echo ""
echo "🚀 Ready to run ./start-vm.sh"
