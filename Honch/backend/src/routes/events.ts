import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { eventBatchingService } from '../services/eventBatchingService.js';

const eventsRoute = new Hono();
eventsRoute.use(cors());

eventsRoute.post('/api/events', async (c) => {
  try {
    const body = await c.req.json();
    // Add IP from request
    body.ipAddress = c.req.header('x-forwarded-for')?.split(',')[0].trim() || c.req.header('x-real-ip') || undefined;
    body.userAgent = c.req.header('user-agent') || '';

    const result = await eventBatchingService.addEvent(body);

    return c.json({
      success: result.success,
      queued: result.queued,
      message: 'Event queued for processing'
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 400);
  }
});

eventsRoute.get('/api/events/batch-status', async (c) => {
  const status = eventBatchingService.getBatchStatus();
  return c.json({ success: true, ...status });
});

export { eventsRoute };