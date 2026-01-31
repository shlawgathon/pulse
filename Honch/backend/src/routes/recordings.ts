import { Hono } from 'hono';
import { db } from '../db';
import { sessionRecordings, sessions } from '../db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

import { cors } from 'hono/cors';

export const recordingsRoute = new Hono();
recordingsRoute.use(cors());

// POST /recordings
recordingsRoute.post(
    '/recordings',
    zValidator(
        'json',
        z.object({
            sessionId: z.string().min(1),
            events: z.array(z.any()),
        })
    ),
    async (c) => {
        const { sessionId, events } = c.req.valid('json');

        try {
            await db.insert(sessionRecordings).values({
                sessionId,
                events,
            });

            return c.json({ success: true });
        } catch (error) {
            console.error('Error saving recording:', error);
            return c.json({ success: false, error: 'Failed to save recording' }, 500);
        }
    }
);

// GET /recordings/:sessionId
recordingsRoute.get('/recordings/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId');

    try {
        const sessionData = await db
            .select()
            .from(sessions)
            .where(eq(sessions.sessionId, sessionId))
            .limit(1);

        if (!sessionData.length) {
            return c.json({ success: false, error: 'Session not found' }, 404);
        }

        const recordings = await db
            .select()
            .from(sessionRecordings)
            .where(eq(sessionRecordings.sessionId, sessionId))
            .orderBy(asc(sessionRecordings.createdAt));

        // Merge events from all recording chunks
        const allEvents = recordings.flatMap((r) => r.events as any[]);

        return c.json({
            success: true,
            session: sessionData[0],
            events: allEvents,
        });
    } catch (error) {
        console.error('Error fetching recording:', error);
        return c.json({ success: false, error: 'Failed to fetch recording' }, 500);
    }
});

// GET /recordings (list recordings for a website)
recordingsRoute.get('/recordings', async (c) => {
    const websiteId = c.req.query('websiteId');

    if (!websiteId) {
        return c.json({ success: false, error: 'websiteId is required' }, 400);
    }

    try {
        const result = await db.selectDistinct({
            sessionId: sessions.sessionId,
            startedAt: sessions.startedAt,
            duration: sessions.duration,
            visitorId: sessions.visitorId,
            city: sessions.city,
            country: sessions.countryCode,
            browser: sessions.browser,
            os: sessions.os,
            device: sessions.device
        })
            .from(sessions)
            .innerJoin(sessionRecordings, eq(sessions.sessionId, sessionRecordings.sessionId))
            .where(eq(sessions.websiteId, websiteId))
            .orderBy(desc(sessions.startedAt))
            .limit(20);

        return c.json({
            success: true,
            recordings: result,
        });
    } catch (error) {
        console.error('Error fetching recordings list:', error);
        return c.json({ success: false, error: 'Failed to fetch recordings list' }, 500);
    }
});
