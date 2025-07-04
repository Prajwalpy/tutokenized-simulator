# Tutokenized Simulator - Windows Setup

## Quick Start (Recommended)

1. **Double-click `quick-start.bat`** in the project folder
2. Wait for services to start
3. Your browser will open automatically to http://localhost:5173

That's it! 🎉

## Manual Setup

If you prefer to start services manually:

### 1. Start the Python Executor
```cmd
start-executor.bat
```

### 2. Start the Frontend
```cmd
npm install
npm run dev
```

## Requirements

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **Python 3.x** - [Download here](https://python.org/) 
  - ⚠️ Make sure to check "Add to PATH" during installation

## Troubleshooting

### "Local executor service error: Failed to fetch"
- The Python executor service isn't running
- Run `start-executor.bat` first
- Check if port 3001 is available

### "Python is not available"
- Install Python 3.x from https://python.org/
- Make sure to check "Add to PATH" during installation
- Restart your command prompt after installation

### "Node.js not found"
- Install Node.js from https://nodejs.org/
- Restart your command prompt after installation

### Port Already in Use
- If port 3001 or 5173 are busy, close other applications
- Or use Task Manager to kill node.exe processes

## What's Running

When started successfully, you'll have:

- **Local Executor**: http://localhost:3001 (Python code execution)
- **Frontend**: http://localhost:5173 (Web interface)

## Using the Application

1. Write Python code in the **Code Editor** tab
2. Click **"Run Code"** to execute
3. See results in the **Debug** tab
4. Use **"Test Connection"** button to verify the executor is working

## Files Overview

- `quick-start.bat` - One-click startup (recommended)
- `start-executor.bat` - Start just the Python executor
- `start-all.bat` - Start everything with detailed output
- `.env.local` - Configuration file

## Need Help?

- Check the **Debug** tab for connection status
- Use the **"Test Connection"** button
- Make sure both Python and Node.js are installed and in PATH

Happy coding! 🚀
