#!/bin/bash

# SOL VM Deployment Script
# This script sets up and runs the polling executor on the SOL VM

set -e

echo "🚀 Setting up SOL VM Polling Executor..."

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or later."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Install required packages
echo "📦 Installing Python dependencies..."
pip3 install --user requests psutil

# Set default configuration if not provided
export TASK_QUEUE_URL="${TASK_QUEUE_URL:-https://your-message-queue-api.herokuapp.com/tasks}"
export RESULT_QUEUE_URL="${RESULT_QUEUE_URL:-https://your-message-queue-api.herokuapp.com/results}"
export API_KEY="${API_KEY:-your-secret-api-key}"
export POLL_INTERVAL="${POLL_INTERVAL:-5}"

echo "📋 Configuration:"
echo "   Task Queue URL: $TASK_QUEUE_URL"
echo "   Result Queue URL: $RESULT_QUEUE_URL"
echo "   API Key: ${API_KEY:0:10}..."
echo "   Poll Interval: ${POLL_INTERVAL}s"

# Check if the message queue API is reachable
echo "🔍 Testing connection to message queue..."
if command -v curl &> /dev/null; then
    if curl -s --head --fail "${TASK_QUEUE_URL}/health" > /dev/null 2>&1; then
        echo "✅ Message queue API is reachable"
    else
        echo "⚠️  Warning: Cannot reach message queue API"
        echo "   Make sure the API is deployed and the URL is correct"
    fi
else
    echo "⚠️  curl not found, skipping connectivity test"
fi

# Create a simple health check script
cat > sol_vm_health_check.py << 'EOF'
#!/usr/bin/env python3
import requests
import os
import sys

def check_health():
    api_key = os.environ.get('API_KEY', 'your-secret-api-key')
    task_queue_url = os.environ.get('TASK_QUEUE_URL', 'https://your-message-queue-api.herokuapp.com/tasks')
    
    try:
        response = requests.get(
            f"{task_queue_url}/health",
            headers={'Authorization': f'Bearer {api_key}'},
            timeout=10
        )
        
        if response.ok:
            print("✅ Message queue API is healthy")
            return True
        else:
            print(f"❌ API returned status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == '__main__':
    success = check_health()
    sys.exit(0 if success else 1)
EOF

chmod +x sol_vm_health_check.py

# Run health check
echo "🏥 Running health check..."
python3 sol_vm_health_check.py

# Function to start the poller
start_poller() {
    echo "🔄 Starting SOL VM Python Poller..."
    python3 sol_vm_python_poller.py \
        --task-queue-url "$TASK_QUEUE_URL" \
        --result-queue-url "$RESULT_QUEUE_URL" \
        --api-key "$API_KEY" \
        --poll-interval "$POLL_INTERVAL"
}

# Create systemd service file (optional)
create_systemd_service() {
    local service_file="/etc/systemd/system/sol-vm-poller.service"
    
    if [ "$EUID" -eq 0 ]; then
        echo "📝 Creating systemd service..."
        
        cat > "$service_file" << EOF
[Unit]
Description=SOL VM Python Poller
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment=TASK_QUEUE_URL=$TASK_QUEUE_URL
Environment=RESULT_QUEUE_URL=$RESULT_QUEUE_URL
Environment=API_KEY=$API_KEY
Environment=POLL_INTERVAL=$POLL_INTERVAL
ExecStart=/usr/bin/python3 $(pwd)/sol_vm_python_poller.py --task-queue-url $TASK_QUEUE_URL --result-queue-url $RESULT_QUEUE_URL --api-key $API_KEY --poll-interval $POLL_INTERVAL
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
        
        systemctl daemon-reload
        systemctl enable sol-vm-poller
        
        echo "✅ Systemd service created. You can now use:"
        echo "   sudo systemctl start sol-vm-poller    # Start the service"
        echo "   sudo systemctl stop sol-vm-poller     # Stop the service"
        echo "   sudo systemctl status sol-vm-poller   # Check status"
        echo "   sudo journalctl -u sol-vm-poller -f   # View logs"
        
    else
        echo "⚠️  Not running as root, skipping systemd service creation"
        echo "   Run with sudo to create a systemd service"
    fi
}

# Create a simple start script
cat > start_sol_vm_poller.sh << 'EOF'
#!/bin/bash
export TASK_QUEUE_URL="${TASK_QUEUE_URL:-https://your-message-queue-api.herokuapp.com/tasks}"
export RESULT_QUEUE_URL="${RESULT_QUEUE_URL:-https://your-message-queue-api.herokuapp.com/results}"
export API_KEY="${API_KEY:-your-secret-api-key}"
export POLL_INTERVAL="${POLL_INTERVAL:-5}"

echo "🚀 Starting SOL VM Python Poller..."
python3 sol_vm_python_poller.py \
    --task-queue-url "$TASK_QUEUE_URL" \
    --result-queue-url "$RESULT_QUEUE_URL" \
    --api-key "$API_KEY" \
    --poll-interval "$POLL_INTERVAL"
EOF

chmod +x start_sol_vm_poller.sh

echo ""
echo "🎉 SOL VM setup complete!"
echo ""
echo "📖 Usage:"
echo "   1. Configure environment variables (optional):"
echo "      export TASK_QUEUE_URL='https://your-api.com/tasks'"
echo "      export RESULT_QUEUE_URL='https://your-api.com/results'"
echo "      export API_KEY='your-secret-key'"
echo ""
echo "   2. Start the poller:"
echo "      ./start_sol_vm_poller.sh"
echo ""
echo "   3. Or run directly:"
echo "      python3 sol_vm_python_poller.py"
echo ""
echo "   4. Check health:"
echo "      python3 sol_vm_health_check.py"
echo ""

# Ask if user wants to create systemd service
if [ "$EUID" -eq 0 ]; then
    read -p "Do you want to create a systemd service? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_systemd_service
    fi
fi

# Ask if user wants to start the poller now
read -p "Do you want to start the poller now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    start_poller
fi
