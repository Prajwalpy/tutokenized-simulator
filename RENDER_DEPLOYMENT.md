# Render Deployment Guide

## ✅ Code is Ready!

Your code has been prepared for Render deployment with the following configurations:

### 🔧 Environment Variables (use these in Render):
- **API_KEY**: `T_pPqciDqdEuPgBFZEsO8Fx7mPxVuhhXL9sai3sztaU`
- **PORT**: `10000`
- **MAX_TASK_AGE_HOURS**: `24`
- **CLEANUP_INTERVAL_MINUTES**: `60`

### 📋 Render Deployment Steps:

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Ready for Render deployment"
   git push origin main
   ```

2. **Deploy on Render**:
   - Go to https://render.com
   - Sign up/Login
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub repository
   
3. **Configure the Service**:
   - **Name**: `tutokenized-queue-api` (or any name you prefer)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python message_queue_api.py`
   - **Environment Variables** (add these):
     ```
     API_KEY = T_pPqciDqdEuPgBFZEsO8Fx7mPxVuhhXL9sai3sztaU
     PORT = 10000
     MAX_TASK_AGE_HOURS = 24
     CLEANUP_INTERVAL_MINUTES = 60
     ```

4. **After Deployment**:
   - Copy your Render app URL (e.g., `https://tutokenized-queue-api.onrender.com`)
   - Update `.env.local` with the real URL:
     ```bash
     VITE_TASK_QUEUE_URL=https://your-actual-app-name.onrender.com/tasks
     VITE_RESULT_QUEUE_URL=https://your-actual-app-name.onrender.com/results
     ```

5. **Test the Deployment**:
   ```bash
   curl https://your-app-name.onrender.com/health
   ```

### 🖥️ SOL VM Setup:

After deployment, run the SOL VM poller on your Sol system:

```bash
python sol_vm_python_poller.py \
  --task-queue-url https://your-app-name.onrender.com/tasks \
  --result-queue-url https://your-app-name.onrender.com/results \
  --api-key T_pPqciDqdEuPgBFZEsO8Fx7mPxVuhhXL9sai3sztaU
```

### 🔄 Testing the Full Pipeline:

1. Frontend submits code → Message Queue API
2. SOL VM polls for tasks → Executes Python code
3. Results posted back → Frontend receives results

Your architecture is ready! 🚀
