# Remote Message Queue Setup Guide

This guide will help you deploy the message queue API that enables communication between your front-end and SOL VM.

## Quick Start Options

### Option 1: Deploy to Heroku (Recommended)

1. **Install Heroku CLI**
   ```bash
   # On Ubuntu/Debian
   curl https://cli-assets.heroku.com/install.sh | sh
   
   # On macOS
   brew tap heroku/brew && brew install heroku
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create and Deploy the App**
   ```bash
   # Navigate to your project directory
   cd /home/tknolast/Desktop/asu_hackathon_2025/tutokenized-simulator
   
   # Initialize git if not already done
   git init
   git add .
   git commit -m "Initial commit"
   
   # Create Heroku app
   heroku create your-solvm-queue-api
   
   # Set environment variables
   heroku config:set API_KEY=$(openssl rand -base64 32)
   heroku config:set MAX_TASK_AGE_HOURS=24
   heroku config:set CLEANUP_INTERVAL_MINUTES=60
   
   # Create a Procfile for Heroku
   echo "web: python message_queue_api.py" > Procfile
   
   # Deploy to Heroku
   git add Procfile
   git commit -m "Add Procfile"
   git push heroku main
   ```

4. **Get Your API URLs**
   ```bash
   # Your API will be available at:
   # https://your-solvm-queue-api.herokuapp.com
   
   # Test the deployment
   curl https://your-solvm-queue-api.herokuapp.com/health
   ```

### Option 2: Deploy to Railway

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Deploy**
   ```bash
   railway login
   railway new
   railway add message_queue_api.py requirements.txt
   railway up
   ```

3. **Set Environment Variables**
   ```bash
   railway variables:set API_KEY=$(openssl rand -base64 32)
   railway variables:set MAX_TASK_AGE_HOURS=24
   ```

### Option 3: Deploy to DigitalOcean App Platform

1. **Go to DigitalOcean App Platform**
   - Visit: https://cloud.digitalocean.com/apps

2. **Create New App**
   - Choose "GitHub" or upload files directly
   - Upload `message_queue_api.py` and `requirements.txt`

3. **Configure App**
   - Runtime: Python
   - Build Command: `pip install -r requirements.txt`
   - Run Command: `python message_queue_api.py`

4. **Set Environment Variables**
   ```
   API_KEY=your-generated-secret-key
   MAX_TASK_AGE_HOURS=24
   CLEANUP_INTERVAL_MINUTES=60
   ```

### Option 4: Deploy to Render

1. **Go to Render**
   - Visit: https://render.com

2. **Create New Web Service**
   - Connect your GitHub repo or upload files
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python message_queue_api.py`

3. **Set Environment Variables**
   ```
   API_KEY=your-generated-secret-key
   MAX_TASK_AGE_HOURS=24
   CLEANUP_INTERVAL_MINUTES=60
   ```

### Option 5: Deploy to Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Create vercel.json**
   ```json
   {
     "builds": [
       {
         "src": "message_queue_api.py",
         "use": "@vercel/python"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "message_queue_api.py"
       }
     ]
   }
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Option 6: Deploy to AWS (EC2 + Elastic Beanstalk)

1. **Install AWS CLI**
   ```bash
   pip install awscli
   aws configure
   ```

2. **Install EB CLI**
   ```bash
   pip install awsebcli
   ```

3. **Initialize and Deploy**
   ```bash
   eb init -p python-3.9 sol-vm-queue
   eb create sol-vm-queue-env
   eb deploy
   ```

### Option 7: Deploy to Google Cloud Run

1. **Install gcloud CLI**
   ```bash
   # Follow: https://cloud.google.com/sdk/docs/install
   gcloud auth login
   gcloud config set project your-project-id
   ```

2. **Create Dockerfile**
   ```dockerfile
   FROM python:3.9-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY message_queue_api.py .
   EXPOSE 8080
   ENV PORT=8080
   CMD ["python", "message_queue_api.py"]
   ```

3. **Deploy**
   ```bash
   gcloud run deploy sol-vm-queue \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

### Option 8: Deploy to Fly.io

1. **Install flyctl**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Initialize and Deploy**
   ```bash
   fly auth login
   fly launch
   fly deploy
   ```

### Option 9: Deploy on Your Own VPS (Ubuntu/Linux)

1. **Prepare Server**
   ```bash
   # SSH into your VPS
   ssh user@your-vps-ip
   
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Python and dependencies
   sudo apt install python3 python3-pip nginx -y
   ```

2. **Deploy Application**
   ```bash
   # Create app directory
   sudo mkdir /var/www/sol-vm-queue
   cd /var/www/sol-vm-queue
   
   # Copy your files
   sudo scp user@local-machine:/path/to/message_queue_api.py .
   sudo scp user@local-machine:/path/to/requirements.txt .
   
   # Install dependencies
   sudo pip3 install -r requirements.txt
   
   # Install gunicorn for production
   sudo pip3 install gunicorn
   ```

3. **Create systemd service**
   ```bash
   sudo nano /etc/systemd/system/sol-vm-queue.service
   ```
   
   Content:
   ```ini
   [Unit]
   Description=SOL VM Queue API
   After=network.target
   
   [Service]
   User=www-data
   WorkingDirectory=/var/www/sol-vm-queue
   Environment=API_KEY=your-secret-key
   Environment=MAX_TASK_AGE_HOURS=24
   ExecStart=/usr/local/bin/gunicorn --bind 0.0.0.0:5000 message_queue_api:app
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   ```

4. **Start service**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable sol-vm-queue
   sudo systemctl start sol-vm-queue
   ```

5. **Configure Nginx (optional)**
   ```bash
   sudo nano /etc/nginx/sites-available/sol-vm-queue
   ```
   
   Content:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```
   
   ```bash
   sudo ln -s /etc/nginx/sites-available/sol-vm-queue /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Option 10: Deploy using Docker (Any Platform)

1. **Create Dockerfile**
   ```dockerfile
   FROM python:3.9-slim
   
   WORKDIR /app
   
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   
   COPY message_queue_api.py .
   
   EXPOSE 5000
   
   ENV FLASK_ENV=production
   
   CMD ["python", "message_queue_api.py"]
   ```

2. **Build and Run**
   ```bash
   # Build image
   docker build -t sol-vm-queue .
   
   # Run container
   docker run -d \
     -p 5000:5000 \
     -e API_KEY=your-secret-key \
     -e MAX_TASK_AGE_HOURS=24 \
     --name sol-vm-queue \
     sol-vm-queue
   ```

3. **Deploy to any Docker hosting**
   - Docker Hub + any cloud provider
   - DigitalOcean Droplets
   - AWS ECS
   - Google Cloud Run
   - Azure Container Instances

### Option 11: Deploy to Netlify Functions

1. **Create netlify.toml**
   ```toml
   [build]
     functions = "netlify/functions"
     
   [build.environment]
     PYTHON_VERSION = "3.9"
     
   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   ```

2. **Create function structure**
   ```bash
   mkdir -p netlify/functions
   cp message_queue_api.py netlify/functions/
   cp requirements.txt netlify/functions/
   ```

3. **Modify for Netlify Functions**
   ```python
   # Create netlify/functions/queue.py
   from message_queue_api import app
   import serverless_wsgi
   
   def handler(event, context):
       return serverless_wsgi.handle_request(app, event, context)
   ```

4. **Deploy via Git**
   ```bash
   git add .
   git commit -m "Deploy to Netlify"
   git push origin main
   # Connect repo to Netlify dashboard
   ```

### Option 12: Deploy to PythonAnywhere

1. **Sign up at PythonAnywhere**
   - Visit: https://www.pythonanywhere.com
   - Great for educational use with free tier

2. **Upload files via web interface**
   - Upload `message_queue_api.py` and `requirements.txt`

3. **Set up web app**
   - Go to Web tab
   - Create new web app
   - Choose Flask
   - Point to your `message_queue_api.py`

4. **Install dependencies**
   ```bash
   # In PythonAnywhere console
   pip3 install --user -r requirements.txt
   ```

### Option 13: Deploy to Deta Space

1. **Install Deta CLI**
   ```bash
   curl -fsSL https://get.deta.dev/cli.sh | sh
   ```

2. **Create deta.json**
   ```json
   {
     "name": "sol-vm-queue",
     "runtime": "python3.9",
     "endpoint": "message_queue_api:app"
   }
   ```

3. **Deploy**
   ```bash
   deta login
   deta new
   deta deploy
   ```

### Option 14: Deploy to Cloudflare Workers (Python)

1. **Install Wrangler**
   ```bash
   npm install -g wrangler
   ```

2. **Create wrangler.toml**
   ```toml
   name = "sol-vm-queue"
   main = "message_queue_api.py"
   compatibility_date = "2023-06-07"
   
   [env.production.vars]
   API_KEY = "your-secret-key"
   ```

3. **Deploy**
   ```bash
   wrangler publish
   ```

### Option 15: Deploy to Supabase Edge Functions

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Create function**
   ```bash
   supabase functions new sol-vm-queue
   ```

3. **Convert to Deno/TypeScript**
   ```typescript
   // supabase/functions/sol-vm-queue/index.ts
   import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
   
   // Convert your Python logic to TypeScript/Deno
   serve(async (req) => {
     // Your queue logic here
     return new Response("Hello from Supabase Edge Functions!")
   })
   ```

4. **Deploy**
   ```bash
   supabase functions deploy sol-vm-queue
   ```

### Option 16: Deploy to Railway (Enhanced Guide)

1. **One-Click Deploy**
   ```bash
   # Option A: CLI deployment
   npx @railway/cli login
   npx @railway/cli deploy
   
   # Option B: GitHub integration
   # 1. Push to GitHub
   # 2. Connect to Railway dashboard
   # 3. Auto-deploy on commits
   ```

2. **Railway Template**
   ```toml
   # railway.toml
   [build]
   builder = "nixpacks"
   
   [deploy]
   healthcheckPath = "/health"
   restartPolicyType = "on-failure"
   
   [env]
   API_KEY = "your-secret-key"
   PORT = "5000"
   ```

## Platform Comparison & Recommendations

### Quick Comparison Table

| Platform | Free Tier | Setup Difficulty | Best For | Deployment Time |
|----------|-----------|------------------|----------|-----------------|
| **Railway** | ✅ Yes | ⭐ Easy | Beginners, prototypes | 2-5 minutes |
| **Render** | ✅ Yes | ⭐ Easy | Simple apps, GitHub integration | 3-7 minutes |
| **Fly.io** | ✅ Yes | ⭐⭐ Medium | Global deployment, performance | 5-10 minutes |
| **Vercel** | ✅ Yes | ⭐⭐ Medium | Serverless, Next.js projects | 3-5 minutes |
| **Netlify** | ✅ Yes | ⭐⭐ Medium | JAMstack, functions | 5-10 minutes |
| **Heroku** | ⚠️ Limited | ⭐ Easy | Traditional apps | 5-10 minutes |
| **PythonAnywhere** | ✅ Yes | ⭐ Easy | Education, learning | 10-15 minutes |
| **DigitalOcean** | ❌ Paid | ⭐⭐ Medium | Production, control | 10-20 minutes |
| **AWS/GCP** | ⚠️ Limited | ⭐⭐⭐ Hard | Enterprise, scaling | 15-30 minutes |
| **VPS/Docker** | ❌ Paid | ⭐⭐⭐ Hard | Full control, custom setup | 20-60 minutes |

### Recommendations by Use Case

**🎓 For Learning/Hackathons:**
- **Railway** - Fastest setup, great free tier
- **PythonAnywhere** - Educational focus, simple interface
- **Render** - GitHub integration, easy deployment

**🚀 For Prototypes/MVP:**
- **Railway** - Quick deployment, database support
- **Fly.io** - Fast global deployment
- **Render** - Automatic deployments from Git

**💼 For Production:**
- **DigitalOcean App Platform** - Balanced cost/features
- **AWS/GCP** - Enterprise features, scaling
- **Your VPS** - Full control, cost optimization

**💰 For Free Hosting (Updated Priority):**
1. **Render** (750hrs/month - Best for hackathons)
2. **Fly.io** (Good free tier, fast deployment)
3. **PythonAnywhere** (Always free, educational)
4. **Vercel Functions** (Serverless, generous free tier)
5. **Railway** (Limited free tier since 2024)

### Step-by-Step Deployment (Recommended: Railway)

**Why Railway?** Fast setup, generous free tier, excellent developer experience.

1. **Deploy to Railway (Fastest)**
   ```bash
   # Option 1: One-click deploy
   npx @railway/cli login
   npx @railway/cli deploy
   
   # Option 2: Connect GitHub repo
   # 1. Push your code to GitHub
   # 2. Visit railway.app
   # 3. Connect your GitHub repo
   # 4. Deploy automatically
   ```

2. **Set Environment Variables**
   ```bash
   # Via CLI
   railway variables set API_KEY=$(openssl rand -base64 32)
   railway variables set MAX_TASK_AGE_HOURS=24
   railway variables set PORT=5000
   
   # Or via Railway dashboard
   # 1. Go to your project dashboard
   # 2. Click "Variables"
   # 3. Add the environment variables
   ```

3. **Get Your Deployment URL**
   ```bash
   # Your API will be available at:
   # https://your-project-name.up.railway.app
   
   # Test the deployment
   curl https://your-project-name.up.railway.app/health
   ```

4. **Update Front-End Configuration**
   ```bash
   # Update .env.local
   cat > .env.local << EOF
   REACT_APP_TASK_QUEUE_URL=https://your-project-name.up.railway.app/tasks
   REACT_APP_RESULT_QUEUE_URL=https://your-project-name.up.railway.app/results
   REACT_APP_API_KEY=your-generated-api-key
   EOF
   ```

## Troubleshooting

### Common Issues

**1. Port Configuration**
- Most platforms use `PORT` environment variable
- Make sure your `message_queue_api.py` reads `os.environ.get('PORT', 5000)`

**2. API Key Security**
- Never commit API keys to Git
- Use environment variables on all platforms
- Generate strong keys: `openssl rand -base64 32`

**3. CORS Issues**
- Ensure CORS is properly configured for your front-end domain
- Add your domain to allowed origins in the Flask app

**4. Health Check Failures**
- Verify `/health` endpoint is accessible
- Check application logs on your deployment platform

### Getting Help

**Platform-Specific Support:**
- **Railway**: [docs.railway.app](https://docs.railway.app)
- **Render**: [render.com/docs](https://render.com/docs)
- **Heroku**: [devcenter.heroku.com](https://devcenter.heroku.com)
- **Fly.io**: [fly.io/docs](https://fly.io/docs)

**General Debugging:**
1. Check application logs on your platform
2. Test endpoints with `curl` or Postman
3. Verify environment variables are set correctly
4. Use the test script: `python3 test_sol_vm_communication.py`

## Next Steps

After successful deployment:

1. ✅ **Deploy the queue API** (completed above)
2. ✅ **Update front-end configuration** with actual URLs
3. ✅ **Deploy SOL VM poller** (see `SOL_VM_COMMUNICATION_GUIDE.md`)
4. ✅ **Test the integration** using provided test scripts
5. ✅ **Monitor and scale** as needed

**Ready to connect your SOL VM?** See the next guide: `SOL_VM_COMMUNICATION_GUIDE.md`
