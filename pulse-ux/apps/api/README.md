# Pulse UX API

FastAPI backend for the Pulse UX Optimizer platform.

## Getting Started

```bash
# Install dependencies
uv sync

# Run development server
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

Once the server is running, visit:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Key Endpoints

### Authentication (`/api/v1/auth`)
- `POST /register` - Create new user account
- `POST /login` - Get access and refresh tokens
- `POST /refresh` - Refresh access token

### Sites (`/api/v1/sites`)
- `POST /` - Register a new site
- `GET /` - List user's sites
- `GET /{site_id}` - Get site details
- `PATCH /{site_id}` - Update site settings

### Experiments (`/api/v1/experiments`)
- `POST /` - Create experiment (triggers async variant generation)
- `GET /` - List experiments with filters
- `GET /{id}` - Get experiment details
- `GET /{id}/variants` - Get all variants
- `POST /{id}/activate` - Start collecting data
- `POST /{id}/complete` - Select winner
- `GET /{id}/recordings` - List session recordings
- `GET /{id}/recordings/{recording_id}` - Get recording with rrweb events

### Actuator (`/api/v1/actuator`) - Public, no auth required
- `POST /assign` - Get variant assignments for visitor
- `POST /track/impression` - Track variant impression
- `POST /track/conversion` - Track conversion event
- `POST /recording` - Upload rrweb session recording events

### Pull Requests (`/api/v1/pull-requests`)
- `POST /generate` - Generate PR for winning variant
- `GET /` - List PRs for experiment

## Database Models

MongoDB collections (Beanie ODM):
- `users` / `refresh_tokens` - Authentication
- `sites` - Registered websites
- `experiments` - A/B test definitions
- `variants` - Control and treatment variants with DOM patches
- `assignments` - Visitor-to-variant sticky bucketing
- `session_recordings` - rrweb session recordings
- `pull_requests` - Generated PR tracking
