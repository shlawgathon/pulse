import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/bun';
import { eventsRoute } from './src/routes/events.js';
import { websitesRoute } from './src/routes/websites.js';
import { analyticsRoute } from './src/routes/analytics.js';
import { authRoute } from './src/routes/auth.js';
import { aiRoute } from './src/routes/ai.js';
import userRoute from './src/routes/user.js';
import { recordingsRoute } from './src/routes/recordings.js';
import 'dotenv/config';
import { prettyJSON } from 'hono/pretty-json';
import jwt from 'jsonwebtoken';
import { addClientToSession, removeClientFromSession } from './src/services/wsHub.js';
import type { ServerWebSocket } from 'bun';

const app = new Hono();

// Serve static script.js file
app.use('/*', serveStatic({ root: './public' }));

app.use('*', logger());
app.use('*', cors());
app.use('*', prettyJSON());

app.get('/', (c) => {
  return c.json({
    message: 'Honch API',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.route('/', eventsRoute);
app.route('/', websitesRoute);
app.route('/', analyticsRoute);
app.route('/', authRoute);
app.route('/', aiRoute);
app.route('/', userRoute);
app.route('/', recordingsRoute);

app.notFound((c) => c.json({ success: false, error: 'Not found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ success: false, error: err.message }, 500);
});

const port = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

console.log(`\x1b[1m\x1b[34m┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\x1b[0m\n\x1b[1m\x1b[34m┃\x1b[0m      \x1b[1mHonch Analytics Server\x1b[0m          \x1b[1m\x1b[34m┃\x1b[0m\n\x1b[1m\x1b[34m┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\x1b[0m\n\x1b[1m\x1b[34m┃\x1b[0m  \x1b[36mURL   \x1b[0m: http://localhost:${port}       \x1b[1m\x1b[34m┃\x1b[0m\n\x1b[1m\x1b[34m┃\x1b[0m  \x1b[36mStatus\x1b[0m: \x1b[32m✔ Healthy\x1b[0m                   \x1b[1m\x1b[34m┃\x1b[0m\n\x1b[1m\x1b[34m┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\x1b[0m`);

Bun.serve({
  port,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      const sessionId = url.searchParams.get('sessionId') || '';
      const token = url.searchParams.get('token') || '';
      try {
        if (!token) throw new Error('Missing token');
        jwt.verify(token, JWT_SECRET);
      } catch {
        return new Response('Unauthorized', { status: 401 });
      }

      const upgraded = server.upgrade(req, {
        data: { sessionId },
      });
      if (upgraded) return undefined;
      return new Response('Upgrade failed', { status: 400 });
    }
    return app.fetch(req);
  },
  websocket: {
    open(ws: ServerWebSocket<{ sessionId: string }>) {
      const sessionId = (ws.data?.sessionId as string) || '';
      addClientToSession(sessionId, ws);
    },
    close(ws: ServerWebSocket<{ sessionId: string }>) {
      const sessionId = (ws.data?.sessionId as string) || '';
      removeClientFromSession(sessionId, ws);
    },
    message() {
      // No-op; server is push-only for now
    }
  }
});