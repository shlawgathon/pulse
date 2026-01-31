import { db, aiUsage, websites, websiteUsers } from '../db/index.js';
import { eq, and, gte, sql } from 'drizzle-orm';

export interface PlanLimits {
  monthlyQueries: number;
  dailyQueries: number;
  hourlyQueries: number;
  monthlyTokens: number;
  dailyTokens: number;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    monthlyQueries: 50,
    dailyQueries: 10,
    hourlyQueries: 3,
    monthlyTokens: 100000, // 100K tokens per month
    dailyTokens: 5000,     // 5K tokens per day
  },
  pro: {
    monthlyQueries: 1000,
    dailyQueries: 100,
    hourlyQueries: 20,
    monthlyTokens: 2000000, // 2M tokens per month
    dailyTokens: 100000,    // 100K tokens per day
  },
  enterprise: {
    monthlyQueries: -1, // Unlimited
    dailyQueries: -1,   // Unlimited
    hourlyQueries: 50,  // Still some hourly limit for abuse prevention
    monthlyTokens: -1,  // Unlimited
    dailyTokens: -1,    // Unlimited
  },
};

export interface UsageStats {
  monthlyQueries: number;
  dailyQueries: number;
  hourlyQueries: number;
  monthlyTokens: number;
  dailyTokens: number;
}

export class AIUsageService {
  static async checkUsageLimits(
    userId: string, 
    websiteId: string
  ): Promise<{ allowed: boolean; reason?: string; usage?: UsageStats; limits?: PlanLimits }> {
    const websiteAccess = await db
      .select({
        websiteId: websites.id,
        plan: websites.plan,
        role: websiteUsers.role,
      })
      .from(websites)
      .innerJoin(websiteUsers, eq(websites.id, websiteUsers.websiteId))
      .where(and(
        eq(websites.id, websiteId),
        eq(websiteUsers.userId, userId)
      ))
      .limit(1);

    if (!websiteAccess.length) {
      return { allowed: false, reason: 'Website not found or access denied' };
    }

    const plan = websiteAccess[0].plan;
    const limits = PLAN_LIMITS[plan];

    if (!limits) {
      return { allowed: false, reason: 'Invalid plan' };
    }

    const usage = await this.getUserUsageStats(userId, websiteId);

    if (limits.hourlyQueries !== -1 && usage.hourlyQueries >= limits.hourlyQueries) {
      return { 
        allowed: false, 
        reason: `Hourly limit reached (${limits.hourlyQueries} queries/hour)`,
        usage,
        limits
      };
    }

    if (limits.dailyQueries !== -1 && usage.dailyQueries >= limits.dailyQueries) {
      return { 
        allowed: false, 
        reason: `Daily limit reached (${limits.dailyQueries} queries/day)`,
        usage,
        limits
      };
    }

    if (limits.monthlyQueries !== -1 && usage.monthlyQueries >= limits.monthlyQueries) {
      return { 
        allowed: false, 
        reason: `Monthly limit reached (${limits.monthlyQueries} queries/month)`,
        usage,
        limits
      };
    }

    if (limits.dailyTokens !== -1 && usage.dailyTokens >= limits.dailyTokens) {
      return { 
        allowed: false, 
        reason: `Daily token limit reached (${limits.dailyTokens} tokens/day)`,
        usage,
        limits
      };
    }

    if (limits.monthlyTokens !== -1 && usage.monthlyTokens >= limits.monthlyTokens) {
      return { 
        allowed: false, 
        reason: `Monthly token limit reached (${limits.monthlyTokens} tokens/month)`,
        usage,
        limits
      };
    }

    return { allowed: true, usage, limits };
  }

  static async recordUsage(
    userId: string,
    websiteId: string,
    queryText: string,
    tokensUsed: number,
    responseTokens: number,
    modelUsed: string = 'o4-mini'
  ): Promise<void> {
    const website = await db.query.websites.findFirst({
      where: eq(websites.id, websiteId),
      columns: { plan: true }
    });

    if (!website) {
      throw new Error('Website not found');
    }

    const totalTokens = tokensUsed + responseTokens;

    await db.insert(aiUsage).values({
      userId,
      websiteId,
      queryText,
      tokensUsed,
      responseTokens,
      totalTokens,
      modelUsed,
      planType: website.plan,
    });
  }

  static async getUserUsageStats(userId: string, websiteId: string): Promise<UsageStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

    const [monthlyStats] = await db
      .select({
        queries: sql<number>`COUNT(*)`,
        tokens: sql<number>`COALESCE(SUM(total_tokens), 0)`,
      })
      .from(aiUsage)
      .where(and(
        eq(aiUsage.userId, userId),
        eq(aiUsage.websiteId, websiteId),
        gte(aiUsage.createdAt, startOfMonth)
      ));

    const [dailyStats] = await db
      .select({
        queries: sql<number>`COUNT(*)`,
        tokens: sql<number>`COALESCE(SUM(total_tokens), 0)`,
      })
      .from(aiUsage)
      .where(and(
        eq(aiUsage.userId, userId),
        eq(aiUsage.websiteId, websiteId),
        gte(aiUsage.createdAt, startOfDay)
      ));

    const [hourlyStats] = await db
      .select({
        queries: sql<number>`COUNT(*)`,
      })
      .from(aiUsage)
      .where(and(
        eq(aiUsage.userId, userId),
        eq(aiUsage.websiteId, websiteId),
        gte(aiUsage.createdAt, startOfHour)
      ));

    return {
      monthlyQueries: Number(monthlyStats?.queries || 0),
      dailyQueries: Number(dailyStats?.queries || 0),
      hourlyQueries: Number(hourlyStats?.queries || 0),
      monthlyTokens: Number(monthlyStats?.tokens || 0),
      dailyTokens: Number(dailyStats?.tokens || 0),
    };
  }

  static async getUserAllWebsitesUsage(userId: string): Promise<Array<{
    websiteId: string;
    websiteName: string;
    websiteDomain: string;
    plan: string;
    usage: UsageStats;
    limits: PlanLimits;
  }>> {
    const userWebsites = await db
      .select({
        websiteId: websites.id,
        websiteName: websites.name,
        websiteDomain: websites.domain,
        plan: websites.plan,
      })
      .from(websites)
      .innerJoin(websiteUsers, eq(websites.id, websiteUsers.websiteId))
      .where(eq(websiteUsers.userId, userId));

    const results = [];
    for (const website of userWebsites) {
      const usage = await this.getUserUsageStats(userId, website.websiteId);
      const limits = PLAN_LIMITS[website.plan];
      
      results.push({
        websiteId: website.websiteId,
        websiteName: website.websiteName,
        websiteDomain: website.websiteDomain,
        plan: website.plan,
        usage,
        limits,
      });
    }

    return results;
  }

  static async getWebsiteUsageHistory(
    userId: string, 
    websiteId: string, 
    days: number = 30
  ): Promise<Array<{
    id: string;
    queryText: string;
    tokensUsed: number;
    responseTokens: number;
    totalTokens: number;
    modelUsed: string;
    createdAt: Date;
  }>> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const hasAccess = await db
      .select({ id: websiteUsers.id })
      .from(websiteUsers)
      .where(and(
        eq(websiteUsers.userId, userId),
        eq(websiteUsers.websiteId, websiteId)
      ))
      .limit(1);

    if (!hasAccess.length) {
      throw new Error('Access denied');
    }

    const history = await db
      .select({
        id: aiUsage.id,
        queryText: aiUsage.queryText,
        tokensUsed: aiUsage.tokensUsed,
        responseTokens: aiUsage.responseTokens,
        totalTokens: aiUsage.totalTokens,
        modelUsed: aiUsage.modelUsed,
        createdAt: aiUsage.createdAt,
      })
      .from(aiUsage)
      .where(and(
        eq(aiUsage.userId, userId),
        eq(aiUsage.websiteId, websiteId),
        gte(aiUsage.createdAt, since)
      ))
      .orderBy(sql`${aiUsage.createdAt} DESC`)
      .limit(100);

    return history;
  }

  static async getUsageByDay(
    userId: string, 
    websiteId: string, 
    days: number = 30
  ): Promise<Array<{
    date: string;
    queries: number;
    tokens: number;
  }>> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const hasAccess = await db
      .select({ id: websiteUsers.id })
      .from(websiteUsers)
      .where(and(
        eq(websiteUsers.userId, userId),
        eq(websiteUsers.websiteId, websiteId)
      ))
      .limit(1);

    if (!hasAccess.length) {
      throw new Error('Access denied');
    }

    const dailyUsage = await db
      .select({
        date: sql<string>`DATE(${aiUsage.createdAt})`,
        queries: sql<number>`COUNT(*)`,
        tokens: sql<number>`SUM(total_tokens)`,
      })
      .from(aiUsage)
      .where(and(
        eq(aiUsage.userId, userId),
        eq(aiUsage.websiteId, websiteId),
        gte(aiUsage.createdAt, since)
      ))
      .groupBy(sql`DATE(${aiUsage.createdAt})`)
      .orderBy(sql`DATE(${aiUsage.createdAt})`);

    return dailyUsage.map(day => ({
      date: day.date,
      queries: Number(day.queries),
      tokens: Number(day.tokens),
    }));
  }
}