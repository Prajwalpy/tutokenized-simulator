# GitHub Actions Deployment Guide

This guide explains how to set up automatic frontend deployment using GitHub Actions for the Tutokenized Simulator project.

## 🚀 Overview

The project includes two GitHub Actions workflows:

1. **`deploy-frontend.yml`** - Automatic production deployment
2. **`preview-build.yml`** - Pull request preview builds

## 🔧 Setup Instructions

### 1. Repository Secrets Configuration

Go to your GitHub repository → Settings → Secrets and variables → Actions, then add these secrets:

#### Required Secrets (Production)
```
VITE_TASK_QUEUE_URL=https://tutokenized-queue-api.onrender.com/tasks
VITE_RESULT_QUEUE_URL=https://tutokenized-queue-api.onrender.com/results
VITE_API_KEY=your_api_key_here
VITE_BACKEND_URL=http://10.139.126.4:8000
```

#### Optional Secrets (Advanced Configuration)
```
VITE_EXECUTOR_TYPE=hybrid
VITE_LOCAL_EXECUTOR_URL=http://localhost:3001
VITE_MAX_RETRIES=5
VITE_RETRY_DELAY=3000
VITE_POLL_INTERVAL=2000
VITE_EXECUTION_TIMEOUT=60
VITE_DEBUG_MODE=false
VITE_AUTO_REFRESH_STATUS=true
```

#### Deployment Platform Secrets

**For GitHub Pages:**
- No additional secrets needed (uses `GITHUB_TOKEN` automatically)
- Optional: `CUSTOM_DOMAIN` for custom domain setup

**For Netlify:**
```
NETLIFY_AUTH_TOKEN=your_netlify_token
NETLIFY_SITE_ID=your_site_id
```

**For Vercel:**
```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
```

### 2. Enable GitHub Pages (Default Option)

1. Go to Repository → Settings → Pages
2. Source: Deploy from a branch
3. Branch: `gh-pages` (will be created automatically)
4. Folder: `/ (root)`

### 3. Workflow Triggers

#### Automatic Deployment Triggers:
- Push to `main` or `master` branch
- Changes to frontend files (`src/`, `public/`, config files)

#### Manual Deployment:
- Go to Actions tab → Deploy Frontend → Run workflow

#### Pull Request Previews:
- Automatic build and analysis on pull requests
- Comments added to PR with build status

## 📋 Workflow Features

### Production Deployment (`deploy-frontend.yml`)

✅ **Build Process:**
- Node.js 20 setup with npm caching
- Dependency installation with `npm ci`
- Code linting with ESLint
- Production build with Vite
- Build analysis and size reporting

✅ **Deployment Options:**
- GitHub Pages (default)
- Netlify (if secrets configured)
- Vercel (if secrets configured)

✅ **Monitoring:**
- Build artifacts uploaded for 30 days
- Detailed logging and status reporting
- Environment variable validation

### Preview Builds (`preview-build.yml`)

✅ **PR Validation:**
- Development build testing
- Code linting verification
- Build size analysis
- Automatic PR comments with build status

✅ **Artifact Management:**
- Preview build artifacts (7-day retention)
- Build analysis reporting

## 🔄 Usage Examples

### Automatic Deployment
```bash
# Simply push to main branch
git add .
git commit -m "Update frontend features"
git push origin main
# ⚡ Deployment starts automatically!
```

### Manual Deployment
1. Go to GitHub repository
2. Click "Actions" tab
3. Select "Deploy Frontend"
4. Click "Run workflow"
5. Choose environment and run

### Environment Configuration
The workflows use environment variables from:
1. GitHub Secrets (highest priority)
2. `.env.production` file (fallback)
3. Default values (basic functionality)

## 🛠️ Customization

### Adding New Deployment Targets

Edit `.github/workflows/deploy-frontend.yml` and add new deployment steps:

```yaml
- name: 🌟 Deploy to Custom Platform
  if: ${{ secrets.CUSTOM_PLATFORM_TOKEN }}
  run: |
    # Your custom deployment script
    echo "Deploying to custom platform..."
```

### Modifying Build Process

```yaml
- name: 🔧 Custom Build Step
  run: |
    # Add custom build steps here
    npm run custom-build-command
```

### Environment-Specific Builds

```yaml
- name: 🏗️ Build for Staging
  if: github.ref == 'refs/heads/staging'
  run: npm run build:staging
  env:
    VITE_ENVIRONMENT: staging
```

## 🐛 Troubleshooting

### Common Issues:

1. **Build Failures:**
   - Check that all required secrets are set
   - Verify `package.json` scripts exist
   - Review build logs in Actions tab

2. **Deployment Failures:**
   - Ensure GitHub Pages is enabled
   - Check deployment platform credentials
   - Verify repository permissions

3. **Environment Variables:**
   - Secrets must start with `VITE_` for Vite projects
   - Double-check secret names and values
   - Test locally with same environment variables

### Debug Mode:
Enable debug mode by setting `VITE_DEBUG_MODE=true` in repository secrets.

## 📊 Monitoring

### Build Status:
- ✅ Green checkmark: Successful deployment
- ❌ Red X: Failed deployment
- 🟡 Yellow circle: In progress

### Artifacts:
- Production builds: 30-day retention
- Preview builds: 7-day retention
- Download from Actions → Workflow run → Artifacts

## 🔗 Deployment URLs

After successful deployment:
- **GitHub Pages:** `https://your-username.github.io/repository-name`
- **Netlify:** Custom URL provided in deployment logs
- **Vercel:** Custom URL provided in deployment logs

## ⚡ Performance Optimization

The workflows include:
- Dependency caching for faster builds
- Parallel job execution where possible
- Optimized bundle analysis
- Conditional deployments to save resources

---

🎉 **Your frontend is now set up for automatic deployment!**

Push your changes to the main branch and watch the magic happen! ✨
