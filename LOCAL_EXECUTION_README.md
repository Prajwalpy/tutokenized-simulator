# Tutokenized Simulator - Local Execution System

The simulator now features a complete local execution system that runs Python code on your machine and displays results directly in the debug console.

## Architecture

1. **Frontend (React)**: Web interface for writing and running code
2. **Local Executor Service (Node.js)**: Executes Python code and saves results to JSON
3. **Temp/Results System**: Manages temporary files and execution results

## How It Works

1. **Write Code**: Use the code editor in the web interface
2. **Click "Run Code"**: Code is sent to the local executor service
3. **Execution**: Service creates a temp Python file, executes it, and captures output
4. **Results**: Output and errors are saved to JSON and displayed in the debug console

## Quick Start

### 1. Start the Local Executor Service
```bash
# In the project root directory
./start-executor.sh
```
This will:
- Install Node.js dependencies
- Check Python availability  
- Start the executor service on http://localhost:3001

### 2. Start the Frontend
```bash
# In another terminal
npm run dev
```

### 3. Test the System
1. Open the frontend in your browser
2. Go to the Debug panel
3. Click "Test Connection" to verify the executor service
4. Write Python code in the editor
5. Click "Run Code" to execute and see results instantly

## Components

### Local Executor Service (`local-executor/`)
- **Port**: 3001
- **Endpoints**:
  - `POST /execute` - Execute Python code
  - `GET /result/:id` - Get execution result by ID
  - `GET /results` - Get all recent results
  - `GET /health` - Service health check
  - `POST /cleanup` - Clean old temp files

### Frontend Updates
- **Code Editor**: Direct execution with real-time results
- **Debug Panel**: Shows execution results, service status, and logs
- **Local Executor Utils**: Handles communication with the executor service

## Features

✅ **Instant Execution**: Results appear immediately in the debug console  
✅ **Real Output**: Actual Python stdout/stderr, not simulated  
✅ **Error Handling**: Proper error messages and stack traces  
✅ **File Management**: Automatic cleanup of temporary files  
✅ **Service Health**: Connection status and health monitoring  
✅ **Result History**: Access to recent execution results  

## Directory Structure

```
tutokenized-simulator/
├── src/                          # React frontend
│   ├── components/
│   │   ├── CodeEditor.tsx        # Updated for local execution
│   │   └── Debug.tsx             # Shows execution results
│   └── utils/
│       └── localExecutor.ts      # Service communication
├── local-executor/               # Node.js executor service
│   ├── server.js                 # Main service
│   ├── package.json             # Dependencies
│   ├── temp/                    # Temporary Python files
│   └── results/                 # Execution result JSONs
└── start-executor.sh            # Service startup script
```

## Example Workflow

1. **Start Services**:
   ```bash
   ./start-executor.sh  # Terminal 1
   npm run dev          # Terminal 2
   ```

2. **Write Code**:
   ```python
   print("Hello, World!")
   import datetime
   print(f"Current time: {datetime.datetime.now()}")
   result = sum(range(10))
   print(f"Sum of 0-9: {result}")
   ```

3. **Execute**: Click "Run Code"

4. **View Results**: See output instantly in the debug panel:
   ```
   Hello, World!
   Current time: 2025-06-27 10:30:45.123456
   Sum of 0-9: 45
   ```

## Requirements

- **Python 3.x**: For code execution
- **Node.js**: For the executor service
- **npm**: For frontend and service dependencies

## Troubleshooting

### Service Not Starting
```bash
# Check if port 3001 is available
lsof -i :3001

# Install Node.js dependencies manually
cd local-executor && npm install
```

### Python Not Found
```bash
# Check Python installation
python3 --version

# Update server.js if using different Python command
# Change 'python3' to 'python' in server.js if needed
```

### Frontend Connection Issues
- Ensure the executor service is running on port 3001
- Check the debug panel for connection status
- Use "Test Connection" button to verify

## Development

### Adding New Features
- **Executor Service**: Modify `local-executor/server.js`
- **Frontend Integration**: Update `src/utils/localExecutor.ts`
- **UI Components**: Modify `src/components/CodeEditor.tsx` or `Debug.tsx`

### API Reference

**Execute Code**:
```javascript
POST /execute
{
  "code": "print('Hello, World!')",
  "timeout": 30
}
```

**Response**:
```javascript
{
  "id": "uuid",
  "success": true,
  "output": "Hello, World!\n",
  "error": "",
  "execution_time": 0.05,
  "timestamp": "2025-06-27T10:30:45.123Z",
  "code": "print('Hello, World!')",
  "system_info": {...}
}
```

This system provides a complete local Python execution environment with real-time results, perfect for development and testing!
