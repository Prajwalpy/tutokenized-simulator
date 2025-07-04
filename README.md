# Tutokenized Simulator

A modern, interactive web platform for running, visualizing, and debugging Python code with GPU/CPU simulation and LLM-powered tutoring. Designed for education, research, and rapid prototyping of code that interacts with both local and cloud (SOL VM) execution environments.

---

## DEMO : 
 https://prajwalpy.github.io/tutokenized-simulator/

--- 

## 🚀 Features

- **Python Code Editor**: Write and edit Python code in the browser
- **Local & SOL VM Execution**: Run code on your local machine or remotely via the SOL VM cloud
- **GPU/CPU Simulation**: Visualize hardware performance, benchmarks, and output
- **LLM Tutor**: Get instant feedback, explanations, and code suggestions from an AI assistant
- **Debug Console**: View real-time output, errors, and system metrics
- **Animated Output**: Supports GIF/video output for code that generates visualizations
- **Easy Deployment**: One-click deploy to GitHub Pages, Netlify, or Vercel

---

## 🛠️ Getting Started

### 1. Clone the Repository

```sh
git clone <YOUR_GIT_URL>
cd tutokenized-simulator
```

### 2. Install Dependencies

```sh
npm install
```

### 3. Configure Environment

- Copy `.env.production` to `.env.local` for local development, or edit `.env.production` for deployment.
- Set the required variables for your backend/executor URLs and API keys.

### 4. Run the Development Server

```sh
npm run dev
```

- Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## ⚡ Deployment (GitHub Actions)

This project is ready for automatic deployment using GitHub Actions.

1. **Push to `main` branch**: The workflow in `.github/workflows/deploy-frontend.yml` will build and deploy your app.
2. **Configure repository secrets**: Go to GitHub → Settings → Secrets and variables → Actions, and add all variables from `.env.production` as repository secrets.
3. **Enable GitHub Pages**: In your repo settings, set Pages source to "GitHub Actions".
4. **Access your site**: After a successful workflow run, your app will be live at `https://<your-username>.github.io/<your-repo-name>/`.

_You can also deploy to Netlify or Vercel by adding the appropriate secrets._

---

## 🧑‍💻 Usage

- **Write Python code** in the editor panel.
- **Run code** using the "Run Code" button. Output and hardware metrics will appear in the debug panel.
- **Switch execution** between local and SOL VM (cloud) as needed.
- **Use the LLM Tutor** to get explanations, code help, and context-aware suggestions.
- **Download or share** your results, GIFs, and logs.

---

## 📦 Project Structure

- `src/` — React frontend source code
- `ml_examples/` — Example Python scripts for simulation
- `local-executor/` — Node.js backend for local code execution
- `.github/workflows/` — GitHub Actions deployment workflows
- `.env.production` — Example environment configuration

---

## 🤝 Contributing

Pull requests and issues are welcome! Please open an issue for bugs, feature requests, or questions.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
