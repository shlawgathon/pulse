# Pulse UX Optimizer

AI-powered UX optimization platform with automated A/B testing.

## Overview

Pulse UX Optimizer enables developers and product teams to:

1. **Generate UX variants** using Claude Opus 4.5, informed by live DOM scraping via Firecrawl
2. **Deploy runtime experiments** without code deployments using an injected "actuator" script
3. **Compare variants side-by-side** with visual diff rendering and AI-generated insights
4. **Choose winning variants** through an intuitive dashboard interface
5. **Generate Pull Requests** automatically to codify the winning variant into the codebase

## Tech Stack

### Frontend
- Next.js 16 with App Router
- React 19
- shadcn/ui + Tailwind CSS 4
- Zustand + TanStack Query

### Backend
- FastAPI (Python 3.12)
- MongoDB Atlas + Beanie ODM
- Redis for caching and job queues
- uv package manager

### External Services
- Firecrawl (DOM scraping)
- OpenRouter (Claude Opus 4.5)
- Resend (email notifications)
- GitHub API (PR creation)

## Project Structure

```
pulse-ux/
├── apps/
│   ├── web/                 # Next.js 16 frontend
│   └── api/                 # FastAPI backend
├── packages/
│   ├── actuator/            # Injector script for customer sites
│   └── shared/              # Shared TypeScript types
└── .github/workflows/       # CI/CD pipelines
```

## Getting Started

### Prerequisites

- Bun >= 1.1.0
- Python >= 3.12
- uv (Python package manager)
- MongoDB Atlas account
- Redis instance

### Installation

```bash
# Install frontend dependencies
bun install

# Install backend dependencies
cd apps/api && uv sync
```

### Development

```bash
# Run both frontend and backend
bun run dev

# Or run separately
bun run dev:web    # Frontend on http://localhost:3000
bun run dev:api    # Backend on http://localhost:8000
```

### Environment Variables

See `.env.example` files in each app directory.

## License

Private - All rights reserved
