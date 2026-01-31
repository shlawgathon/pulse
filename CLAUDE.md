# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pulse UX Optimizer is an AI-powered A/B testing platform. The main application lives in `pulse-ux/` (the `Honch/` directory is a separate, unrelated project).

## Commands

### Development
```bash
# From pulse-ux/ directory:
bun run dev              # Start both frontend and backend (uses concurrently)
bun run dev:web          # Frontend only (Next.js on :3000)
bun run dev:api          # Backend only (FastAPI on :8000)

# Or directly:
cd apps/api && uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
cd apps/web && bun run dev
```

### Building
```bash
bun run build            # Build frontend
bun run build:actuator   # Build client-side script (IIFE bundle)
cd packages/actuator && bun run build
```

### Testing & Linting
```bash
bun run test:api         # Run pytest for backend
bun run lint             # Run Next.js ESLint + Prettier check
bun run format           # Format code with Prettier
cd apps/api && uv run ruff check .   # Python linting
cd apps/api && uv run pytest tests/test_file.py::test_name  # Single test
```

## Architecture

```
pulse-ux/
├── apps/
│   ├── api/              # FastAPI backend (Python 3.12+ with uv)
│   │   └── src/
│   │       ├── models/       # Beanie ODM documents (MongoDB)
│   │       ├── routers/      # API endpoints
│   │       ├── services/     # Business logic
│   │       ├── integrations/ # External APIs (Firecrawl, OpenRouter, GitHub, Resend)
│   │       ├── config.py     # Pydantic settings
│   │       └── database.py   # MongoDB connection
│   └── web/              # Next.js 16 frontend (React 19)
│       └── src/
│           ├── app/
│           │   ├── (marketing)/  # Landing page (dark theme)
│           │   ├── (auth)/       # Login/Register pages
│           │   └── (dashboard)/  # Main app (light theme)
│           │       ├── experiments/  # Experiment management
│           │       ├── sites/        # Site registration
│           │       └── settings/     # User settings
│           ├── components/   # React components
│           ├── lib/          # Utilities (api-client.ts, etc.)
│           └── types/        # TypeScript types
└── packages/
    └── actuator/         # Client-side A/B script
        ├── src/index.ts  # Script source
        └── dist/         # Built IIFE bundle (actuator.js)
```

### Data Flow

1. **Experiment Creation**: User submits target URL → Firecrawl scrapes DOM → LLM generates variants → Variants stored in MongoDB
2. **Runtime Testing**: Actuator script fetches assignments from `/api/v1/actuator/assign` → Applies DOM patches → Tracks impressions/conversions
3. **PR Generation**: User selects winner → LLM transforms patches to code → GitHub API creates branch and PR

### Key External Services

- **Firecrawl**: DOM scraping (`src/integrations/firecrawl.py`)
- **OpenRouter**: LLM for variant generation (`src/integrations/openrouter.py`) - Currently using `moonshotai/kimi-k2.5` model
- **GitHub**: PR creation (`src/integrations/github.py`)
- **Resend**: Email notifications (`src/integrations/resend.py`)

## API Routes

All routes are prefixed with `/api/v1`:

- `/auth/*` - JWT authentication with refresh tokens, Google OAuth
- `/sites/*` - Site registration and management
- `/experiments/*` - Experiment CRUD and lifecycle
- `/actuator/*` - Public endpoints for client script (no auth required)
- `/pull-requests/*` - PR generation and status

Health check: `GET /health`

## Frontend Patterns

- **State**: TanStack Query v5 for server state, Zustand v5 for client state
- **API calls**: Use `api.get/post/patch/delete` from `src/lib/api-client.ts`
- **Components**: shadcn/ui with Tailwind CSS, lime-400 accent color
- **Themes**: Marketing pages use dark theme, dashboard uses light theme
- **Forms**: React Hook Form v7 + Zod v4 for validation

## Database Models

MongoDB documents in `apps/api/src/models/`:
- `User` / `RefreshToken` - Authentication
- `Site` - Registered websites with public keys
- `Experiment` - A/B test definitions with status lifecycle
- `Variant` - Control and treatment variants with DOM patches (`DOMPatch`, `PatchAction`)
- `Assignment` - Visitor-to-variant sticky bucketing
- `PullRequest` - Generated PR tracking (`PRStatus`)

## Environment Setup

### Backend (`apps/api/.env`)
Copy `.env.example` to `.env` and fill in:
- `DATABASE_URL` - MongoDB Atlas connection string
- `JWT_SECRET` - Generate with `openssl rand -hex 32`
- `FIRECRAWL_API_KEY` - From https://firecrawl.dev
- `OPENROUTER_API_KEY` - From https://openrouter.ai/keys
- `RESEND_API_KEY` - From https://resend.com
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For OAuth (optional)

### Frontend (`apps/web/.env.local`)
Copy `.env.example` to `.env.local`:
- `NEXT_PUBLIC_API_URL` - Backend URL (default: `http://localhost:8000`)
- `NEXT_PUBLIC_APP_URL` - Frontend URL (default: `http://localhost:3000`)

## Tech Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | Next.js + React | 16.1.6 / 19.x |
| Styling | Tailwind CSS + shadcn/ui | 3.4.x |
| Backend | FastAPI + uvicorn | 0.115.x |
| Database | MongoDB (Beanie ODM) | - |
| Package Manager | bun | 1.3.8 |
| Python Manager | uv | - |
| LLM | OpenRouter (Kimi K2.5) | - |
