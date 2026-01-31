# Honch Monorepo

A full-stack web analytics platform built with React & Hono.

## Agent-Based Architecture Workflow
| Planning Agent | Query Agent | Validation Agent | Analysis Agent |
|----------------|-------------|------------------|----------------|
| Understands intent & breaks down complex asks | Generates safe SQL | Validates query & results | Generates insights & recommendations |

## User Subscription Plans
| Plan        | Monthly Queries | Daily Queries | Hourly Queries | Monthly Tokens | Daily Tokens | Team Members |
|-------------|----------------|--------------|---------------|---------------|--------------|--------------|
| **Free**    | 50             | 10           | 3             | 100,000       | 5,000        | 1            |
| **Pro**     | 1,000          | 100          | 20            | 2,000,000     | 100,000      | 5            |
| **Enterprise** | Unlimited   | Unlimited    | 1,000         | Unlimited     | Unlimited    | Unlimited    |

## Embed Tracking Script
Add this to your website's HTML:

```html
<script 
  defer 
  data-website-id="YOUR_WEBSITE_ID" 
  data-domain="yourdomain.com" 
  src="https://api.honch.io/script.js">
</script>
```

### Development

Run both frontend and backend in development mode:
```bash
bun run dev
```

Or run them separately:
```bash
# Backend only
bun run dev:backend

# Frontend only
bun run dev:frontend
```

### Building

Build the frontend for production:
```bash
bun run build
```

### Database

Run database migrations:
```bash
bun run generate
bun run migrate
```

### Google Cloud Run Deployment

1. Build and push to Google Container Registry:
   ```bash
   docker build -t gcr.io/asterix-sh/honch .
   gcloud builds submit --tag gcr.io/asterix-sh/honch
   ```

2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy honch \
     --image gcr.io/asterix-sh/honch \
     --platform managed \
     --allow-unauthenticated \
     --region us-central1 \
     --set-env-vars DATABASE_URL="YOUR NEON URL" \
           GOOGLE_AI_API_KEY="YOUR GOOGLE AI API KEY" \
           VERTEX_AI_MODEL="gemini-2.0-flash-exp" \
           GITHUB_CLIENT_ID="YOUR CLIENT ID" \
           GITHUB_CLIENT_SECRET="YOUR CLIENT SECRET" \
           FRONTEND_URL="https://honch.io" \
           GITHUB_REDIRECT_URI="https://honch.io/api/auth/github/callback"
   ```