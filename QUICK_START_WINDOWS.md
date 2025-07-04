# Tutokenized Simulator - Windows Quick Guide

## 🚀 Quick Start

### Option 1: One-Click Start (Recommended)
Double-click `quick-start.bat` in the project folder.

### Option 2: PowerShell
```powershell
.\quick-start.ps1
```

### Option 3: Manual Steps
1. Run `start-executor.bat` (starts Python execution service)
2. Run `npm run dev` (starts web interface)

## 📋 Requirements

- **Node.js** (v16+) - https://nodejs.org/
- **Python 3.x** - https://python.org/downloads/
  - ⚠️ Check "Add to PATH" during installation

## 🎯 URLs

- **Frontend**: http://localhost:5173
- **Executor**: http://localhost:3001

## 💡 Usage

1. Open the web interface
2. Write Python code in the editor
3. Click "Run Code"
4. See output in Debug tab

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Failed to fetch" error | Run `start-executor.bat` first |
| Python not found | Install Python, check "Add to PATH" |
| Node.js not found | Install Node.js from nodejs.org |
| Port 3001 busy | Close other apps using that port |

### Test Your Setup
Run `test-setup.bat` to check everything is working.

### Debug Connection
Use the "Test Connection" button in the Debug tab.

## 📁 Key Files

- `quick-start.bat` - One-click startup
- `start-executor.bat` - Start just the Python service  
- `test-setup.bat` - Verify your configuration
- `.env.local` - Settings (auto-created)

## 🆘 Need Help?

1. Check `WINDOWS_SETUP.md` for detailed instructions
2. Run `test-setup.bat` to diagnose issues
3. Make sure Python and Node.js are in your PATH

Happy coding! 🐍✨
