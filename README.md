<div align="center">

# Pulse

<img width="120" height="120" alt="Pulse Logo" src="https://github.com/user-attachments/assets/76f0d704-3049-4e6a-9fd5-634851c636b2" />

### AI-Powered UX Optimization
**Scan. Generate. Test. Ship.**

[Demo](https://pulse.dev) · [Documentation](https://docs.pulse.dev) · [Report Bug](https://github.com/shlawg/pulse/issues)

</div>

---

## ⚡️ What is Pulse?

Pulse is an autonomous agent that fixes your UX conversion leaks.

Instead of just telling you what's wrong, Pulse **generates code** to fix it. It runs A/B tests on your live site using a lightweight script, collects data, and winning variants are automatically converted into GitHub Pull Requests.

> **"It's like having a senior frontend engineer and a data scientist working 24/7."**

## ✨ Features

- **🔍 Generative UI**: Our AI doesn't just chat—it writes production-ready React/HTML code to improved your components.
- **🚀 Zero-Config Deployment**: Usage via a single `<script>` tag. No complex CI/CD setup required for experiments.
- **🧪 Auto-Pilot Testing**: Traffic allocation, statistical significance, and rollback are handled automatically.
- **📦 One-Click PRs**: When a variant wins, Pulse opens a PR in your repo with the permanent code change.

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, TailwindCSS, shadcn/ui |
| **Backend** | FastAPI, Python 3.12 |
| **AI Engine** | Claude 3.5 Sonnet / Opus (via OpenRouter) |
| **Data** | MongoDB Atlas, Firecrawl |

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.12+
- Bun

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/shlawg/pulse.git
cd pulse

# 2. Install dependencies
bun install
cd apps/api && pip install -r requirements.txt

# 3. Sets up environment
cp .env.example .env

# 4. Run locally
bun dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
