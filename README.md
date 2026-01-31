<div align="center">

# Pulse

<img width="256" height="256" alt="Pulse Logo" src="https://github.com/user-attachments/assets/76f0d704-3049-4e6a-9fd5-634851c636b2" />

**UX/UI A/B Testing reimagined**

</div>

---

Pulse UX Optimizer is an AI-powered A/B testing platform that automates the entire UX experimentation workflow—it scrapes your live site's DOM using Firecrawl, feeds that structure to Claude Opus 4.5 via OpenRouter to generate UX improvement variants as JSON patches, then deploys those variants at runtime through a lightweight injected "actuator" script without requiring any code deployments.

Users manage experiments through a Next.js dashboard where they can view side-by-side comparisons with synchronized screenshots and metrics, select winning variants, and automatically generate GitHub pull requests that translate the runtime DOM patches into actual source code changes ready for version control.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, shadcn/ui, Bun, Vercel |
| **Backend** | FastAPI, uv, Railway |
| **Database** | MongoDB Atlas |
| **Integrations** | Firecrawl (scraping), OpenRouter (LLM), Resend (email), GitHub (PR creation) |
