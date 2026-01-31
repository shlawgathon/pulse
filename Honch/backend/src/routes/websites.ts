import { Hono } from 'hono';
import { db, websites, websiteUsers } from '../db/index.js';
import { generatePublicId } from '../utils/helpers.js';
import { getRealTimeVisitors, getTrafficOverTime, getWebsiteStats } from '../services/analyticsService.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, AuthenticatedContext } from '../middleware/auth.js';

const websitesRoute = new Hono();

websitesRoute.post('/api/websites', authMiddleware, async (c) => {
  try {
    const authC = c as unknown as AuthenticatedContext;
    const { name, domain, timezone } = await c.req.json();
    if (!name || !domain) return c.json({ success: false, error: 'Missing name or domain' }, 400);

    const existingWebsite = await db.select().from(websites).where(eq(websites.domain, domain)).limit(1);
    if (existingWebsite.length > 0) return c.json({ success: false, error: 'Website domain already exists' }, 400);
    
    const publicId = generatePublicId();
    const [website] = await db.insert(websites).values({ name, domain, publicId, timezone: timezone || 'UTC' }).returning();
    
    // Create website-user relationship with owner role
    await db.insert(websiteUsers).values({
      websiteId: website.id,
      userId: authC.user.id,
      role: 'owner',
    });
    
    const trackingCode = `<script defer data-website-id="${publicId}" data-domain="${domain}" src="https://api.honch.io/script.js"></script>`;
    return c.json({ success: true, website: { ...website, trackingCode } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 400);
  }
});

websitesRoute.patch('/api/websites/:publicId', authMiddleware, async (c) => {
  try {
    const authC = c as unknown as AuthenticatedContext;
    const { publicId } = c.req.param();
    const { timezone } = await c.req.json();
    if (!timezone) return c.json({ success: false, error: 'Missing timezone' }, 400);

    const websiteAccess = await db
      .select()
      .from(websites)
      .innerJoin(websiteUsers, eq(websites.id, websiteUsers.websiteId))
      .where(and(
        eq(websites.publicId, publicId),
        eq(websiteUsers.userId, authC.user.id)
      ))
      .limit(1);

    if (!websiteAccess.length) return c.json({ success: false, error: 'Not found' }, 404);

    const site = websiteAccess[0].websites;
    const [updated] = await db.update(websites)
      .set({ timezone })
      .where(eq(websites.id, site.id))
      .returning();

    return c.json({ success: true, website: updated });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 400);
  }
});

websitesRoute.get('/api/websites', authMiddleware, async (c) => {
  const authC = c as unknown as AuthenticatedContext;
  
  // Get websites that the user has access to
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
      timezone: websites.timezone,
    })
    .from(websites)
    .innerJoin(websiteUsers, eq(websites.id, websiteUsers.websiteId))
    .where(eq(websiteUsers.userId, authC.user.id));

  const realtimeUsers = await Promise.all(userWebsites.map(async (website) => await getRealTimeVisitors(website.id)));
  const trafficOverTime = await Promise.all(userWebsites.map(async (website) => await getTrafficOverTime(website.id, 30)));
  
  return c.json({ success: true, websites: userWebsites, realtimeUsers, trafficOverTime });
});

websitesRoute.get('/api/websites/:publicId/stats', authMiddleware, async (c) => {
  const authC = c as unknown as AuthenticatedContext;
  const { publicId } = c.req.param();
  
  // Check if user has access to this website
  const websiteAccess = await db
    .select()
    .from(websites)
    .innerJoin(websiteUsers, eq(websites.id, websiteUsers.websiteId))
    .where(and(
      eq(websites.publicId, publicId),
      eq(websiteUsers.userId, authC.user.id)
    ))
    .limit(1);
  
  if (websiteAccess.length === 0) {
    return c.json({ success: false, error: 'Not found' }, 404);
  }
  
  const site = websiteAccess[0].websites;
  const stats = await getWebsiteStats(site.id, 30);
  return c.json({ success: true, stats });
});

export { websitesRoute };
