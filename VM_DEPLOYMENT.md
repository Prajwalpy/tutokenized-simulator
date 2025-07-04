# Tutokenized Simulator - VM Deployment Guide

## Quick Start for VM Environment

### Prerequisites
- Node.js (v16 or higher)
- Python 3 
- npm

### Installation & Startup

1. **Navigate to the project directory:**
   ```bash
   cd /home/tknolast/Desktop/asu_hackathon_2025/tutokenized-simulator
   ```

2. **Run the VM startup script:**
   ```bash
   ./start-vm.sh
   ```

   This script will:
   - Install all required dependencies
   - Start the local Python executor service on port 3001
   - Start the frontend development server on port 5173
   - Display helpful information

3. **Open your browser:**
   - Go to `http://localhost:5173`
   - The application should load with the code editor

### How It Works

When you click "Run Code" in the UI:

1. **Code Download**: The code from the editor is sent to the local executor service
2. **Local Execution**: The service saves the code to a temporary Python file
3. **Python Execution**: The code is executed using `python3` command locally
4. **Output Capture**: Both stdout and stderr are captured
5. **Result Display**: The output is sent back and displayed in the Debug tab

### Testing the System

1. **Go to the Debug tab** and click "Test Connection" to verify the executor service
2. **Write some Python code** in the editor, for example:
   ```python
   print("Hello from local Python execution!")
   
   # Test basic calculations
   result = 10 + 20
   print(f"10 + 20 = {result}")
   
   # Test imports
   import datetime
   print(f"Current time: {datetime.datetime.now()}")
   ```
3. **Click "Run Code"** - you should see the output in the Debug tab
4. **Check execution time** - it will show how long the code took to run

### Troubleshooting

#### Executor Service Issues
- Check if Node.js is installed: `node --version`
- Check if Python 3 is installed: `python3 --version`
- Restart the executor: `cd local-executor && npm start`

#### Port Conflicts
- If port 3001 or 5173 are in use, stop other services:
  ```bash
  sudo lsof -i :3001
  sudo lsof -i :5173
  ```

#### Debug Tab Not Showing Output
- Check browser console for errors (F12)
- Verify executor service is running: `curl http://localhost:3001/health`
- Try the "Test Connection" button in the Debug tab

### Project Structure

```
tutokenized-simulator/
├── local-executor/          # Python execution service
│   ├── server.js           # Express server for code execution
│   ├── package.json        # Node.js dependencies
│   ├── temp/              # Temporary Python files
│   └── results/           # Execution results
├── src/
│   ├── components/
│   │   ├── CodeEditor.tsx  # Code input interface
│   │   └── Debug.tsx       # Output display
│   └── utils/
│       └── localExecutor.ts # Frontend API client
├── start-vm.sh            # VM startup script
└── package.json           # Frontend dependencies
```

### API Endpoints

The local executor service provides:
- `POST /execute` - Execute Python code
- `GET /health` - Service health check  
- `GET /result/:id` - Get execution result by ID
- `POST /cleanup` - Clean old temporary files

### Security Notes

- Code execution is local only (no remote servers)
- Temporary files are automatically cleaned up
- Execution has a 30-second timeout limit
- Only Python 3 is supported

### Stopping Services

Press `Ctrl+C` in the terminal where you ran `./start-vm.sh`, or run:
```bash
pkill -f "node.*server.js"
pkill -f "vite.*dev"
```
