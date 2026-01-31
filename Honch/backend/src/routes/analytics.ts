import { Hono } from 'hono';
import { db, websites, websiteUsers } from '../db/index.js';
import { 
  getWebsiteStats, 
  getRealTimeVisitors, 
  getTopPages, 
  getTrafficOverTime, 
  getTopReferrers, 
  getDeviceBreakdown, 
  getCountryBreakdown, 
  getTopEvents,
  getVisitors
} from '../services/analyticsService.js';
import { and, eq } from 'drizzle-orm';
import { AuthenticatedContext, authMiddleware } from '../middleware/auth.js';

const analyticsRoute = new Hono();

analyticsRoute.get('/api/analytics/:publicId', async (c) => {
  const { publicId } = c.req.param();
  const days = Number(c.req.query('days') || 30);
  const site = await db.query.websites.findFirst({ where: eq(websites.publicId, publicId) });
  if (!site) return c.json({ success: false, error: 'Not found' }, 404);
  
  const [stats, realTime, topPages, trafficOverTime, topReferrers, deviceBreakdown, countryBreakdown] = await Promise.all([
    getWebsiteStats(site.id, days),
    getRealTimeVisitors(site.id),
    getTopPages(site.id, days),
    getTrafficOverTime(site.id, days),
    getTopReferrers(site.id, days),
    getDeviceBreakdown(site.id, days),
    getCountryBreakdown(site.id, days),
  ]);

  return c.json({
    success: true,
    analytics: {
      ...stats,
      realTimeVisitors: realTime,
      topPages,
      trafficOverTime,
      topReferrers,
      deviceBreakdown,
      countryBreakdown,
    },
  });
});

analyticsRoute.get('/api/analytics/:domain/visitors', async (c) => {
  const { domain } = c.req.param();
  const days = Number(c.req.query('days') || 30);
  const site = await db.query.websites.findFirst({ where: eq(websites.domain, domain) });
  if (!site) return c.json({ success: false, error: 'Not found' }, 404);
  const visitors = await getVisitors(site.id, days);
  return c.json({ success: true, visitors: visitors.visitors });
});

analyticsRoute.get('/api/analytics/:publicId/events', authMiddleware, async (c) => {
  const { publicId } = c.req.param();
  const authC = c as unknown as AuthenticatedContext;
  const days = Number(c.req.query('days') || 30);
  const count = Number(c.req.query('count') || 10);
  const userWebsites = await db
  .select({
    id: websites.id,
    name: websites.name,
    domain: websites.domain,
    publicId: websites.publicId,
    plan: websites.plan,
    isActive: websites.isActive,
    createdAt: websites.createdAt,
    updatedAt: websites.updatedAt,
    role: websiteUsers.role,
  })
  .from(websites)
  .innerJoin(websiteUsers, eq(websites.id, websiteUsers.websiteId))
  .where(and(
    eq(websiteUsers.userId, authC.user.id),
    eq(websites.publicId, publicId)
  ));

  if (!userWebsites.length) return c.json({ success: false, error: 'Not found' }, 404);
  
  const topEvents = await Promise.all(userWebsites.map(async (website) => await getTopEvents(website.id, days, count)));
  return c.json({ success: true, events: topEvents });
});

export { analyticsRoute };