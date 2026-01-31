# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pulse UX Optimizer is an AI-powered A/B testing platform. The main application lives in `pulse-ux/` (the `Honch/` directory is a separate, unrelated project).

## Commands

### Development
```bash
# From pulse-ux/ directory:
bun run dev              # Start both frontend and backend
bun run dev:web          # Frontend only (Next.js on :3000)
bun run dev:api          # Backend only (FastAPI on :8000)

# Or directly:
cd apps/api && uv run uvicorn src.main:app --reload
cd apps/web && bun run dev
```

### Building
```bash
bun run build            # Build frontend
bun run build:actuator   # Build client-side script
cd packages/actuator && bun run build
```

### Testing & Linting
```bash
bun run test:api         # Run pytest for backend
bun run lint             # Run Next.js ESLint
cd apps/api && uv run ruff check .   # Python linting
cd apps/api && uv run pytest tests/test_file.py::test_name  # Single test
```

## Architecture

```
pulse-ux/
├── apps/
│   ├── api/              # FastAPI backend (Python 3.12 + uv)
│   │   └── src/
│   │       ├── models/       # Beanie ODM documents (MongoDB)
│   │       ├── routers/      # API endpoints
│   │       ├── services/     # Business logic
│   │       ├── integrations/ # External APIs
│   │       └── workers/      # Background tasks
│   └── web/              # Next.js 16 frontend (React 19)
│       └── src/app/
│           ├── (marketing)/  # Landing page (dark theme)
│           ├── (auth)/       # Login/Register
│           └── (dashboard)/  # Main app (light theme)
└── packages/
    └── actuator/         # Client-side A/B script (IIFE bundle)
```

### Data Flow

1. **Experiment Creation**: User submits target URL → Firecrawl scrapes DOM → Claude generates variants → Variants stored in MongoDB
2. **Runtime Testing**: Actuator script fetches assignments from `/api/v1/actuator/assign` → Applies DOM patches → Tracks impressions/conversions
3. **PR Generation**: User selects winner → LLM transforms patches to code → GitHub API creates branch and PR

### Key External Services

- **Firecrawl**: DOM scraping (`src/integrations/firecrawl.py`)
- **OpenRouter**: Claude Opus 4.5 for variant generation (`src/integrations/openrouter.py`)
- **GitHub**: PR creation (`src/integrations/github.py`)
- **Resend**: Email notifications (`src/integrations/resend.py`)

## API Routes

- `/api/v1/auth/*` - JWT authentication with refresh tokens
- `/api/v1/sites/*` - Site registration and management
- `/api/v1/experiments/*` - Experiment CRUD and lifecycle
- `/api/v1/actuator/*` - Public endpoints for client script (no auth)
- `/api/v1/pull-requests/*` - PR generation and status

## Frontend Patterns

- **State**: TanStack Query for server state, Zustand for client state
- **API calls**: Use `api.get/post/patch/delete` from `src/lib/api-client.ts`
- **Components**: shadcn/ui with Tailwind CSS, lime-400 accent color
- **Themes**: Marketing pages use dark theme, dashboard uses light theme

## Database Models

MongoDB documents in `src/models/`:
- `User` / `RefreshToken` - Authentication
- `Site` - Registered websites with public keys
- `Experiment` - A/B test definitions with status lifecycle
- `Variant` - Control and treatment variants with DOM patches
- `Assignment` - Visitor-to-variant sticky bucketing
- `PullRequest` - Generated PR tracking

## Environment Setup

Copy `.env.example` to `.env` in `apps/api/` and `apps/web/` and fill in:
- `DATABASE_URL` - MongoDB Atlas connection string
- `JWT_SECRET` - Generate with `openssl rand -hex 32`
- `FIRECRAWL_API_KEY`, `OPENROUTER_API_KEY`, `RESEND_API_KEY` - External service keys
