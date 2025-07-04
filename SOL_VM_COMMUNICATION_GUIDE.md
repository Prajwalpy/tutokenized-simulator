# SOL VM Remote Communication Solution

## Problem Statement

The front-end needs to communicate with the SOL VM back-end, but traditional API calls won't work because:
- The front-end will be deployed remotely
- The SOL VM can make outbound API calls but cannot receive inbound API calls
- Need to ensure code execution requests reach the SOL VM and results are returned to the front-end

## Solution Architecture

We've implemented a **polling-based message queue system** that acts as an intermediary between the front-end and SOL VM:

```
Front-End → Message Queue API ← SOL VM (polling)
    ↓                              ↑
    Submit Tasks              Poll for Tasks
    Poll for Results          Submit Results
```

### Components

1. **Hybrid Executor** (`hybridExecutor.ts`) - Front-end component
2. **Polling Executor** (`pollingExecutor.ts`) - SOL VM TypeScript component  
3. **Python Poller** (`sol_vm_python_poller.py`) - SOL VM Python component
4. **Message Queue API** (`message_queue_api.py`) - Cloud-deployed intermediary service

## How It Works

### 1. Task Submission (Front-end)
```typescript
const executor = new HybridSolVMExecutor({
  taskQueueUrl: 'https://your-message-queue-api.com/tasks',
  resultQueueUrl: 'https://your-message-queue-api.com/results'
});

const result = await executor.executeCode('print("Hello from SOL VM")', 30);
```

The front-end:
1. Submits code execution task to the message queue API
2. Starts polling for results from the same API
3. Returns the result when available or times out

### 2. Task Processing (SOL VM)
```bash
# On SOL VM
python3 sol_vm_python_poller.py \
  --task-queue-url "https://your-message-queue-api.com/tasks" \
  --result-queue-url "https://your-message-queue-api.com/results" \
  --api-key "your-secret-key"
```

The SOL VM:
1. Continuously polls the message queue API for new tasks
2. Executes Python code when tasks are available
3. Submits execution results back to the API
4. Includes system metrics and VM information

### 3. Message Queue API (Cloud Service)
The intermediary API handles:
- Task queue management
- Result storage and retrieval
- VM status tracking
- Authentication and security
- Automatic cleanup of old data

## Deployment Instructions

### 1. Deploy Message Queue API

**Option A: Heroku**
```bash
# Create Heroku app
heroku create your-message-queue-api

# Set environment variables
heroku config:set API_KEY=your-secret-api-key
heroku config:set DATABASE_PATH=/tmp/message_queue.db

# Deploy
git add message_queue_api.py requirements.txt
git commit -m "Add message queue API"
git push heroku main
```

**Option B: Railway**
```bash
# Install Railway CLI and deploy
railway login
railway new
railway add message_queue_api.py
railway deploy
```

**Option C: DigitalOcean App Platform**
- Upload `message_queue_api.py` and `requirements.txt`
- Set environment variables in the dashboard
- Deploy

### 2. Configure Front-end

Update your front-end to use the hybrid executor:

```typescript
// In your React component
import { HybridSolVMExecutor } from './utils/hybridExecutor';

const executor = new HybridSolVMExecutor({
  taskQueueUrl: 'https://your-message-queue-api.herokuapp.com/tasks',
  resultQueueUrl: 'https://your-message-queue-api.herokuapp.com/results'
});

// Use it like the local executor
const result = await executor.executeCode(code, timeout);
```

### 3. Deploy SOL VM Poller

**Transfer files to SOL VM:**
```bash
scp sol_vm_python_poller.py user@sol-vm-ip:/home/user/
scp deploy_sol_vm.sh user@sol-vm-ip:/home/user/
scp requirements.txt user@sol-vm-ip:/home/user/
```

**On SOL VM:**
```bash
# Set environment variables
export TASK_QUEUE_URL="https://your-message-queue-api.herokuapp.com/tasks"
export RESULT_QUEUE_URL="https://your-message-queue-api.herokuapp.com/results"
export API_KEY="your-secret-api-key"

# Run deployment script
chmod +x deploy_sol_vm.sh
./deploy_sol_vm.sh

# Or install and run manually
pip3 install requests psutil
python3 sol_vm_python_poller.py
```

## Configuration Options

### Environment Variables

**Message Queue API:**
- `API_KEY` - Secret key for authentication
- `DATABASE_PATH` - SQLite database file path
- `MAX_TASK_AGE_HOURS` - How long to keep old tasks (default: 24)
- `CLEANUP_INTERVAL_MINUTES` - Cleanup frequency (default: 60)

**SOL VM Poller:**
- `TASK_QUEUE_URL` - URL of the task queue API
- `RESULT_QUEUE_URL` - URL of the result queue API  
- `API_KEY` - Authentication key
- `POLL_INTERVAL` - How often to poll in seconds (default: 5)

### Hybrid Executor Options

```typescript
const executor = new HybridSolVMExecutor({
  taskQueueUrl: 'https://api.com/tasks',
  resultQueueUrl: 'https://api.com/results',
  maxRetries: 3,           // Retry attempts
  retryDelay: 2000,        // Delay between retries (ms)
  pollInterval: 3000       // Result polling interval (ms)
});
```

## Security Considerations

1. **API Key Authentication** - All requests require valid API key
2. **HTTPS/TLS** - Use HTTPS for all API communications
3. **Input Validation** - Code execution is sandboxed in subprocess
4. **Rate Limiting** - Consider adding rate limiting to the API
5. **Firewall Rules** - SOL VM only needs outbound HTTPS access

## Monitoring and Debugging

### Health Checks

**API Health:**
```bash
curl https://your-message-queue-api.com/health
```

**SOL VM Health:**
```bash
python3 sol_vm_health_check.py
```

### Queue Status

```bash
curl -H "Authorization: Bearer your-api-key" \
  https://your-message-queue-api.com/status
```

Response:
```json
{
  "pending_tasks": 2,
  "active_vms": 1,
  "avg_execution_time": 1.45,
  "queue_health": "healthy"
}
```

### Logs

**SOL VM Logs:**
```bash
# If using systemd service
sudo journalctl -u sol-vm-poller -f

# If running manually
python3 sol_vm_python_poller.py  # Logs to stdout
```

## Alternative Implementations

### Firebase Integration

```typescript
import { FirebaseHybridExecutor } from './utils/hybridExecutor';

const executor = new FirebaseHybridExecutor(firebaseDb);
const result = await executor.executeCode(code, timeout);
```

### WebSocket Alternative

For real-time communication, you could implement WebSocket connections where:
1. SOL VM maintains persistent WebSocket connection to cloud service
2. Front-end sends tasks via WebSocket
3. Results are pushed back through the WebSocket

## Troubleshooting

### Common Issues

1. **SOL VM can't reach API**
   - Check internet connectivity
   - Verify API URL is correct and accessible
   - Check firewall rules allow outbound HTTPS

2. **Authentication failures**
   - Verify API key is correct
   - Check API key environment variable

3. **Tasks not being processed**
   - Verify SOL VM poller is running
   - Check poller logs for errors
   - Verify Python dependencies are installed

4. **Slow execution**
   - Reduce polling intervals
   - Check network latency
   - Monitor system resources

### Testing

**Test full workflow:**
```bash
# 1. Start message queue API
python3 message_queue_api.py

# 2. Start SOL VM poller
python3 sol_vm_python_poller.py

# 3. Test from front-end
# Use the hybrid executor in your application
```

## Performance Considerations

- **Polling Frequency**: Balance between responsiveness and resource usage
- **Batch Processing**: Process multiple tasks in a single poll cycle
- **Connection Pooling**: Reuse HTTP connections
- **Database Optimization**: Use indexes and regular cleanup
- **Horizontal Scaling**: Deploy multiple SOL VMs for load distribution

## Cost Optimization

- **Serverless API**: Use serverless platforms to reduce idle costs
- **Database Choice**: PostgreSQL for production, SQLite for development
- **CDN**: Cache static API responses
- **Monitoring**: Track API usage to optimize polling frequency

This solution provides a robust, scalable way for your front-end to communicate with SOL VM while working around the networking constraints.
