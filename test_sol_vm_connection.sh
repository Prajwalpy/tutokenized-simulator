#!/bin/bash

# Test connection to Sol VM backend (206.206.198.5)

SOL_VM_IP="206.206.198.5"
BACKEND_PORT="8000"
BACKEND_URL="http://${SOL_VM_IP}:${BACKEND_PORT}"

echo "🧪 Testing Connection to Sol VM Backend"
echo "======================================="
echo "Sol VM IP: $SOL_VM_IP"
echo "Backend URL: $BACKEND_URL"
echo ""

echo "🔍 Testing backend connectivity..."

# Test 1: Basic connectivity
echo "Test 1: Basic connection to root endpoint"
if curl -s --connect-timeout 10 "$BACKEND_URL/" > /dev/null; then
    echo "✅ Basic connection successful"
    curl -s "$BACKEND_URL/" | python3 -m json.tool 2>/dev/null || echo "Response received but not JSON"
else
    echo "❌ Cannot connect to $BACKEND_URL"
    echo "   Make sure:"
    echo "   - Backend is running on Sol VM"
    echo "   - Port 8000 is open in firewall"
    echo "   - Sol VM is accessible from your network"
    exit 1
fi

echo ""
echo "Test 2: Health check endpoint"
if curl -s --connect-timeout 10 "$BACKEND_URL/api/health" > /dev/null; then
    echo "✅ Health check successful"
    curl -s "$BACKEND_URL/api/health" | python3 -m json.tool
else
    echo "❌ Health check failed"
fi

echo ""
echo "Test 3: Code execution test"
TEST_CODE='{"code": "print(\"Hello from Sol VM!\")\nimport platform\nprint(f\"Platform: {platform.platform()}\")\nresult = 2 + 2\nprint(f\"2 + 2 = {result}\")", "timeout": 10}'

if curl -s --connect-timeout 10 -X POST "$BACKEND_URL/api/execute/python" \
   -H "Content-Type: application/json" \
   -d "$TEST_CODE" > /dev/null; then
    echo "✅ Code execution test successful"
    curl -s -X POST "$BACKEND_URL/api/execute/python" \
         -H "Content-Type: application/json" \
         -d "$TEST_CODE" | python3 -m json.tool
else
    echo "❌ Code execution test failed"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. If all tests passed: Start your frontend with 'npm run dev'"
echo "2. If tests failed: Check Sol VM backend setup"
echo "3. Frontend will be available at: http://localhost:8080"
echo "4. Backend API docs available at: $BACKEND_URL/docs"
