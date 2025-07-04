# GitHub Actions Deployment Status

Add these badges to your README.md to show deployment status:

## Deployment Status Badges

```markdown
![Deploy Frontend](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/actions/workflows/deploy-frontend.yml/badge.svg)
![Preview Build](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/actions/workflows/preview-build.yml/badge.svg)
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name.

## Example README Section

```markdown
## 🚀 Deployment

This project uses GitHub Actions for automatic deployment:

- **Production:** ![Deploy Frontend](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/actions/workflows/deploy-frontend.yml/badge.svg)
- **Preview Builds:** ![Preview Build](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/actions/workflows/preview-build.yml/badge.svg)

### Live Demo
🌐 [View Live Application](https://your-username.github.io/your-repo-name)

### Deployment Status
- ✅ Automatic deployment on push to main branch
- 🔍 PR preview builds and analysis
- 📊 Build size monitoring and optimization
- 🛡️ Lint and type checking
```

## Deployment Information Panel

You can also add a more detailed deployment info section:

```markdown
## 📊 Deployment Information

| Environment | Status | URL | Last Deploy |
|-------------|--------|-----|-------------|
| Production | ![Deploy](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/actions/workflows/deploy-frontend.yml/badge.svg) | [Live Site](https://your-username.github.io/your-repo-name) | Auto on push to main |
| Preview | ![Preview](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/actions/workflows/preview-build.yml/badge.svg) | PR Artifacts | Auto on PR |

### 🔧 Build Details
- **Framework:** Vite + React + TypeScript
- **Deployment:** GitHub Pages
- **Build Time:** ~2-3 minutes
- **Bundle Size:** Monitored and reported
```
