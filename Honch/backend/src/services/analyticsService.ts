import { db, events, sessions, websites } from '../db/index.js';
import { eq, sql, and, gte, desc, count } from 'drizzle-orm';

export async function getWebsiteStats(websiteId: string, days: number = 30) {
  const since = new Date(Date.now() - days * 86400 * 1000);
  const website = await db.query.websites.findFirst({ where: eq(websites.id, websiteId) });
  const [pageviews] = await db.select({ count: sql`count(*)` })
    .from(events)
    .where(and(eq(events.websiteId, websiteId), gte(events.createdAt, since)));
  const [visitors] = await db.select({ count: sql`count(distinct ${events.visitorId})` })
    .from(events)
    .where(and(eq(events.websiteId, websiteId), gte(events.createdAt, since)));
  const [sessionCount] = await db.select({ count: sql`count(distinct ${events.sessionId})` })
    .from(events)
    .where(and(eq(events.websiteId, websiteId), gte(events.createdAt, since)));
  const [avgDuration] = await db.select({ avg: sql`avg(duration)` })
    .from(sessions)
    .where(and(
      eq(sessions.websiteId, websiteId),
      gte(sessions.startedAt, since),
      sql`duration >= 2`,
      sql`duration <= 3600`
    ));
  return {
    pageviews: Number(pageviews.count),
    visitors: Number(visitors.count),
    sessions: Number(sessionCount.count),
    avgDuration: Number(avgDuration.avg) || 0,
    domain: website?.domain || '',
    privateId: website?.id || '',
    timezone: website?.timezone || 'UTC',
  };
}

export async function getVisitors(websiteId: string, days: number = 30) {
  const since = new Date(Date.now() - days * 86400 * 1000);
  const [visitors] = await db.select({ count: sql`count(distinct ${events.visitorId})` })
    .from(events)
    .where(and(eq(events.websiteId, websiteId), gte(events.createdAt, since)));
  return {
    visitors: Number(visitors.count),
  };
}

export async function getRealTimeVisitors(websiteId: string) {
  // Get the last 5 minutes of events
  const since = new Date(Date.now() - 5 * 60 * 1000);
  const [active] = await db.select({ count: sql`count(distinct ${events.visitorId})` })
    .from(events)
    .where(and(eq(events.websiteId, websiteId), gte(events.createdAt, since)));
  return Number(active.count);
}

export async function getTopPages(websiteId: string, days: number) {
  const since = new Date(Date.now() - days * 86400 * 1000);
  // Get the website domain to strip from URLs
  const website = await db.query.websites.findFirst({
    where: eq(websites.id, websiteId),
    columns: { domain: true }
  });

  const topPages = await db.select({
    href: events.href,
    pageviews: sql<number>`count(*)`,
  })
    .from(events)
    .where(and(
      eq(events.websiteId, websiteId),
      eq(events.eventType, 'pageview'),
      gte(events.createdAt, since)
    ))
    .groupBy(events.href)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return topPages.map(page => {
    let pagePath = page.href || '/';

    // Strip domain from all paths but keep params
    if (website?.domain) {
      try {
        const url = new URL(pagePath);
        if (url.hostname === website.domain) {
          pagePath = url.pathname + url.search + url.hash;
        }
      } catch (e) {
        // If URL parsing fails, keep the original path
      }
    }

    return {
      page: pagePath,
      pageviews: Number(page.pageviews),
    };
  });
}

export async function getTrafficOverTime(websiteId: string, days: number) {
  const since = new Date(Date.now() - days * 86400 * 1000);
  // pull website timezone, default to UTC
  const website = await db.query.websites.findFirst({ where: eq(websites.id, websiteId) });
  const tz = website?.timezone || 'UTC';

  // Group by local date for the website's timezone using Postgres AT TIME ZONE
  const dateExpr = sql`(date(${events.createdAt} at time zone ${sql.raw(`'${tz}'`)}))`;

  const traffic = await db.select({
    date: sql<string>`${dateExpr}`,
    pageviews: sql<number>`count(*)`,
    visitors: sql<number>`count(distinct ${events.visitorId})`,
  })
    .from(events)
    .where(and(
      eq(events.websiteId, websiteId),
      gte(events.createdAt, since)
    ))
    .groupBy(sql`${dateExpr}`)
    .orderBy(sql`${dateExpr}`);

  return traffic.map(day => ({
    date: day.date,
    pageviews: Number(day.pageviews),
    visitors: Number(day.visitors),
  }));
}

export async function getTopReferrers(websiteId: string, days: number) {
  const since = new Date(Date.now() - days * 86400 * 1000);

  // First get the website domain to exclude internal referrers
  const website = await db.query.websites.findFirst({
    where: eq(websites.id, websiteId),
    columns: { domain: true }
  });

  if (!website) return [];

  const referrers = await db.select({
    referrer: events.referrer,
    visits: sql<number>`count(distinct ${events.visitorId})`,
  })
    .from(events)
    .where(and(
      eq(events.websiteId, websiteId),
      gte(events.createdAt, since),
      sql`${events.referrer} is not null`,
      sql`${events.referrer} != ''`,
      sql`position(${website.domain} in ${events.referrer}) = 0`
    ))
    .groupBy(events.referrer)
    .orderBy(desc(sql`count(distinct ${events.visitorId})`))
    .limit(10);

  return referrers.map(ref => ({
    referrer: ref.referrer || 'Direct',
    visits: Number(ref.visits),
  }));
}

export async function getDeviceBreakdown(websiteId: string, days: number) {
  const since = new Date(Date.now() - days * 86400 * 1000);
  const devices = await db.select({
    device: events.device,
    visitors: sql<number>`count(distinct ${events.visitorId})`,
  })
    .from(events)
    .where(and(
      eq(events.websiteId, websiteId),
      gte(events.createdAt, since),
      sql`${events.device} is not null`
    ))
    .groupBy(events.device)
    .orderBy(desc(sql`count(distinct ${events.visitorId})`));

  return devices.map(device => ({
    device: device.device || 'Unknown',
    visitors: Number(device.visitors),
  }));
}

export async function getCountryBreakdown(websiteId: string, days: number) {
  const since = new Date(Date.now() - days * 86400 * 1000);
  const countries = await db.select({
    country: events.countryCode,
    visitors: sql<number>`count(distinct ${events.visitorId})`,
  })
    .from(events)
    .where(and(
      eq(events.websiteId, websiteId),
      gte(events.createdAt, since),
      sql`${events.countryCode} is not null`
    ))
    .groupBy(events.countryCode)
    .orderBy(desc(sql`count(distinct ${events.visitorId})`))
    .limit(10);

  return countries.map(country => ({
    country: country.country || 'Unknown',
    visitors: Number(country.visitors),
  }));
}

export async function getTopEvents(websiteId: string, days: number, count: number = 10) {
  const since = new Date(Date.now() - days * 86400 * 1000);
  const topEvents = await db.select({
    eventName: events.eventName,
    count: sql<number>`count(*)`,
  })
    .from(events)
    .where(and(
      eq(events.websiteId, websiteId),
      gte(events.createdAt, since)
    ))
    .groupBy(events.eventName)
    .orderBy(desc(sql`count(*)`))
    .limit(count);

  return topEvents.map(topEvent => ({
    eventName: topEvent.eventName || 'Unknown',
    count: Number(topEvent.count),
  }));
}