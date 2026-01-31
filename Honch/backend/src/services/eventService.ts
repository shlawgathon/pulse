import { db, websites, events, sessions } from '../db/index.js';
import { parseUserAgent } from '../utils/userAgent.js';
import { getGeo } from '../utils/geoip.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const eventSchema = z.object({
  websiteId: z.string().length(32),
  domain: z.string().min(1),
  visitorId: z.string().length(36),
  sessionId: z.string().length(36),
  eventType: z.string().max(50),
  eventName: z.string().max(100).optional(),
  href: z.string().url(),
  referrer: z.string().url().nullable().optional(),
  viewport: z.object({ width: z.number(), height: z.number() }),
  extraData: z.record(z.any()).optional(),
  userAgent: z.string(),
  ipAddress: z.string(),
});

export async function recordEvent(input: unknown) {
  const data = eventSchema.parse(input);

  const website = await db.query.websites.findFirst({
    where: eq(websites.publicId, data.websiteId),
  });
  if (!website || !website.isActive) throw new Error('Invalid website');

  const { browser, os, device } = parseUserAgent(data.userAgent);
  const { countryCode, city } = await getGeo(data.ipAddress);

  let session = await db.query.sessions.findFirst({
    where: eq(sessions.sessionId, data.sessionId),
  });
  if (!session) {
    await db.insert(sessions).values({
      websiteId: website.id,
      sessionId: data.sessionId,
      visitorId: data.visitorId,
      startedAt: new Date(),
      pageViews: 1,
      entryPage: data.href,
      referrer: data.referrer || '',
      countryCode,
      city,
      device,
      browser,
      os,
    });
  } else {
    const now = new Date();
    const duration = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);
    
    await db.update(sessions)
      .set({
        pageViews: (session.pageViews || 1) + 1,
        endedAt: now,
        duration: duration,
        exitPage: data.href,
        countryCode,
        city,
        device,
        browser,
        os,
      })
      .where(eq(sessions.sessionId, data.sessionId));
  }

  const [event] = await db.insert(events).values({
    websiteId: website.id,
    visitorId: data.visitorId,
    sessionId: data.sessionId,
    eventType: data.eventType,
    eventName: data.eventName,
    href: data.href,
    referrer: data.referrer || '',
    viewport: data.viewport,
    extraData: data.extraData || {},
    userAgent: data.userAgent,
    ipAddress: data.ipAddress,
    countryCode,
    city,
    device,
    browser,
    os,
    createdAt: new Date(),
  }).returning();

  return { success: true, eventId: event.id };
}
