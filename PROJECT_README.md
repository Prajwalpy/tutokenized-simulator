# Tutokenized Simulator - Full Stack Setup Guide

A comprehensive AI-powered GPU tutoring platform with a React frontend and FastAPI backend for remote code execution.

## Architecture

```
┌─────────────────┐    HTTP API     ┌──────────────────┐
│   Frontend      │ ←─────────────→ │   Backend        │
│   (React/Vite)  │                 │   (FastAPI)      │
│   Port: 8080    │                 │   Port: 8000     │
└─────────────────┘                 └──────────────────┘
       Local                          Remote Sol VM
```

## Quick Start

### 1. Backend Setup (Remote Sol VM)

```bash
# Clone or copy the project to your Sol VM
cd backend

# Run setup (installs Python dependencies)
./setup.sh

# Start the backend server
./start.sh
```

The backend will be available at `http://your-sol-vm-ip:8000`

### 2. Frontend Setup (Local Development)

```bash
# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:8080`

### 3. Configure Connection

Update `src/config/backend.ts` with your Sol VM details:

```typescript
export const BACKEND_CONFIG = {
  DEFAULT_URL: 'http://your-sol-vm-ip:8000',
  // ...
};
```

## Features

### 🚀 **Code Execution**
- Execute Python code remotely on Sol VM
- Real-time output and error handling
- Support for popular data science libraries (NumPy, Pandas, Matplotlib)
- Configurable execution timeouts

### 🐛 **Debug Console**
- Real-time execution results
- System monitoring (CPU, memory, disk usage)
- Connection status and health checks
- Detailed error reporting and logging

### 🎯 **User Interface**
- Modern React-based frontend with shadcn/ui components
- Real-time simulation environment
- Interactive code editor with syntax highlighting
- Responsive design with Tailwind CSS

### 🔧 **Backend API**
- FastAPI-based REST API
- Automatic API documentation (Swagger UI)
- CORS support for cross-origin requests
- Health monitoring and system information endpoints

## Project Structure

```
tutokenized-simulator/
├── src/                          # Frontend source code
│   ├── components/              # React components
│   │   ├── CodeEditor.tsx       # Code editor with execution
│   │   ├── Debug.tsx            # Debug console and monitoring
│   │   ├── WorkspaceTabs.tsx    # Main workspace interface
│   │   └── ui/                  # Reusable UI components
│   ├── config/
│   │   └── backend.ts           # Backend configuration
│   └── pages/
│       └── Index.tsx            # Main application page
├── backend/                     # Backend source code
│   ├── main.py                  # FastAPI application
│   ├── requirements.txt         # Python dependencies
│   ├── setup.sh                 # Setup script
│   ├── start.sh                 # Startup script
│   ├── test_backend.sh          # Testing script
│   ├── README.md                # Backend documentation
│   └── DEPLOYMENT.md            # Deployment guide
├── package.json                 # Node.js dependencies
└── vite.config.ts              # Vite configuration
```

## API Endpoints

### Health & System
- `GET /` - Root endpoint
- `GET /api/health` - Health check with system stats
- `GET /api/system/info` - Detailed system information
- `GET /api/test` - Connectivity test

### Code Execution
- `POST /api/execute/python` - Execute Python code
- `POST /api/upload/python` - Upload and execute Python file

### Example API Usage

```bash
# Health check
curl http://your-sol-vm:8000/api/health

# Execute Python code
curl -X POST http://your-sol-vm:8000/api/execute/python \
     -H "Content-Type: application/json" \
     -d '{"code": "print(\"Hello World!\")", "timeout": 30}'
```

## Development Workflow

### 1. Local Development
```bash
# Terminal 1: Start backend (locally for testing)
cd backend
./start.sh

# Terminal 2: Start frontend
npm run dev
```

### 2. Remote Development
```bash
# Deploy backend to Sol VM
scp -r backend/ user@sol-vm:/path/to/backend/

# SSH to Sol VM and start backend
ssh user@sol-vm
cd /path/to/backend
./start.sh

# Locally: Update frontend config and start
# Edit src/config/backend.ts
npm run dev
```

## Configuration

### Backend Configuration (`backend/.env`)
```env
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=["*"]
MAX_EXECUTION_TIME=30
LOG_LEVEL=info
```

### Frontend Configuration (`src/config/backend.ts`)
```typescript
export const BACKEND_CONFIG = {
  DEFAULT_URL: 'http://your-sol-vm-ip:8000',
  DEFAULT_TIMEOUT: 30,
  CONNECTION_TIMEOUT: 5000
};
```

## Usage

### 1. Code Execution Flow

1. **Write Code**: Use the CodeEditor component to write Python code
2. **Execute**: Click "Run Code" to send code to the backend
3. **Monitor**: View execution results in the Debug console
4. **Debug**: Check system information and error details

### 2. Backend Connection

1. **Configure**: Set your Sol VM IP in `src/config/backend.ts`
2. **Test**: Use the "Test Connection" button in the Debug tab
3. **Execute**: Run test code to verify end-to-end functionality

### 3. Monitoring

- **System Stats**: View CPU, memory, and disk usage from Sol VM
- **Execution Time**: Monitor code execution performance
- **Error Handling**: Detailed error messages and stack traces
- **Connection Status**: Real-time connection status indicators

## Deployment

### Production Deployment on Sol VM

1. **Setup Environment**:
   ```bash
   sudo apt update
   sudo apt install python3 python3-pip python3-venv nginx -y
   ```

2. **Deploy Backend**:
   ```bash
   git clone <your-repo>
   cd backend
   ./setup.sh
   ```

3. **Use Process Manager**:
   ```bash
   # Option 1: PM2
   npm install -g pm2
   pm2 start main.py --interpreter python3

   # Option 2: Systemd service
   sudo systemctl enable tutokenized-backend
   sudo systemctl start tutokenized-backend
   ```

4. **Configure Reverse Proxy** (Optional):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       location / {
           proxy_pass http://localhost:8000;
       }
   }
   ```

### Frontend Deployment

```bash
# Build for production
npm run build

# Deploy to static hosting (Netlify, Vercel, etc.)
# or serve with nginx
```

## Testing

### Backend Testing
```bash
cd backend
./test_backend.sh
```

### Frontend Testing
1. Open the application in browser
2. Navigate to Debug tab
3. Test connection to backend
4. Execute sample code
5. Verify output and system information

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if backend is running: `netstat -tlnp | grep 8000`
   - Verify firewall settings: `sudo ufw status`

2. **CORS Errors**
   - Update `allow_origins` in `backend/main.py`
   - Ensure frontend URL is whitelisted

3. **Python Execution Errors**
   - Check virtual environment activation
   - Verify Python dependencies: `pip list`

4. **Frontend Build Issues**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility

### Debug Commands

```bash
# Check backend status
curl http://localhost:8000/api/health

# View backend logs
tail -f backend.log

# Test code execution
curl -X POST http://localhost:8000/api/execute/python \
     -H "Content-Type: application/json" \
     -d '{"code": "print(\"test\")"}'
```

## Security Considerations

- **Code Execution**: Backend runs in a restricted environment
- **CORS**: Configure specific origins for production
- **Rate Limiting**: Consider implementing for production use
- **Authentication**: Add API keys or JWT for production
- **Firewall**: Only expose necessary ports (8000 for backend)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test both frontend and backend
5. Submit a pull request

## Technologies Used

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
- **Lucide React** - Icons

### Backend
- **FastAPI** - Web framework
- **Python 3.8+** - Runtime
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **psutil** - System monitoring

## License

This project is part of the ASU Hackathon 2025 and follows the event's terms and conditions.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review API documentation at `http://backend-url:8000/docs`
3. Test individual components using provided scripts
4. Verify network connectivity between frontend and backend
