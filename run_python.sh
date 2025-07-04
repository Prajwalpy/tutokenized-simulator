#!/bin/bash

# Helper script to run downloaded Python files from the tutokenized simulator

echo "=== Tutokenized Simulator - Local Python Execution Helper ==="
echo ""

# Check if Python is available
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ Error: Python is not installed or not in PATH"
    echo "Please install Python 3.x and try again"
    exit 1
fi

echo "✅ Found Python: $($PYTHON_CMD --version)"
echo ""

# Check for downloaded Python files
DOWNLOAD_DIR="$HOME/Downloads"
TEMP_FILES=$(find "$DOWNLOAD_DIR" -name "temp_code_*.py" -mtime -1 2>/dev/null)

if [ -z "$TEMP_FILES" ]; then
    echo "ℹ️  No recent Python files found in Downloads folder"
    echo "   Download a .py file from the simulator first, then run this script"
    echo ""
    echo "Or specify a file manually:"
    echo "   $0 /path/to/your/file.py"
    exit 0
fi

echo "📁 Found recent Python files:"
echo "$TEMP_FILES" | nl
echo ""

# If a file was specified as argument, use it
if [ "$1" ]; then
    if [ -f "$1" ]; then
        SELECTED_FILE="$1"
        echo "🎯 Using specified file: $SELECTED_FILE"
    else
        echo "❌ Error: File '$1' not found"
        exit 1
    fi
else
    # Auto-select the most recent file
    SELECTED_FILE=$(echo "$TEMP_FILES" | head -1)
    echo "🎯 Auto-selecting most recent file: $(basename "$SELECTED_FILE")"
fi

echo ""
echo "🚀 Executing Python code..."
echo "================================"

# Execute the Python file
$PYTHON_CMD "$SELECTED_FILE"

RESULT=$?
echo ""
echo "================================"

if [ $RESULT -eq 0 ]; then
    echo "✅ Execution completed successfully!"
else
    echo "❌ Execution failed with exit code: $RESULT"
fi

echo ""
echo "🧹 Clean up downloaded file? (y/N)"
read -r CLEANUP

if [[ $CLEANUP =~ ^[Yy]$ ]]; then
    rm "$SELECTED_FILE"
    echo "✅ File cleaned up: $(basename "$SELECTED_FILE")"
else
    echo "📁 File kept: $SELECTED_FILE"
fi

echo ""
echo "🔄 Run another file? (y/N)"
read -r RERUN

if [[ $RERUN =~ ^[Yy]$ ]]; then
    exec "$0"
fi

echo "👋 Thanks for using Tutokenized Simulator!"
