import { Hono } from 'hono';
import { askAnalyticsAssistant } from '../services/azureChatServices';
import { AuthenticatedContext, authMiddleware } from '../middleware/auth';
import { AIUsageService } from '../services/aiUsageService';
import { aiUsageLimitMiddleware, aiUsageInfoMiddleware } from '../middleware/aiUsage';

export const aiRoute = new Hono();

aiRoute.post('/api/chat', authMiddleware, aiUsageLimitMiddleware, async (c) => {
    const authC = c as unknown as AuthenticatedContext;
    const { websiteId, question, chatHistory, sessionId } = await c.req.json();
    
    if (!question) {
        return c.json({ success: false, error: 'Question is required' }, 400);
    }
    
    let safeChatHistory: { role: 'user' | 'assistant'; content: string }[] = [];
    if (Array.isArray(chatHistory)) {
        safeChatHistory = chatHistory.filter(
            (m) => m && typeof m === 'object' && 
                   typeof m.role === 'string' && 
                   typeof m.content === 'string' && 
                   ['user', 'assistant'].includes(m.role)
        );
    }
    
    console.log(`🤖 AI Agent Request - User: ${authC.user.id}, Website: ${websiteId}, Question: "${question}"`);
    
    try {
        const result = await askAnalyticsAssistant(
            authC.user.id, 
            websiteId, 
            question, 
            safeChatHistory,
            sessionId
        );
        
        if (!result.success) {
            console.log(`❌ AI Agent Request failed: ${result.error}`);
            return c.json({
                success: false,
                error: result.error,
                usage: result.usage,
                limits: result.limits,
            }, 400);
        }
        
        console.log(`✅ AI Agent Request successful`);
        
        return c.json({
            success: true,
            answer: result.answer,
            usage: result.usage,
            limits: result.limits
        });
    } catch (err: any) {
        console.error('❌ AI Agent Architecture error:', err);
        return c.json({ 
            success: false, 
            error: err.message || 'AI agent processing failed',
        }, 500);
    }
});

aiRoute.get('/api/ai/usage', authMiddleware, async (c) => {
    const authC = c as unknown as AuthenticatedContext;
    
    try {
        const allWebsitesUsage = await AIUsageService.getUserAllWebsitesUsage(authC.user.id);
        
        const totalUsage = allWebsitesUsage.reduce((acc, website) => {
            acc.totalMonthlyQueries += website.usage.monthlyQueries;
            acc.totalDailyQueries += website.usage.dailyQueries;
            acc.totalMonthlyTokens += website.usage.monthlyTokens;
            acc.totalDailyTokens += website.usage.dailyTokens;
            return acc;
        }, {
            totalMonthlyQueries: 0,
            totalDailyQueries: 0,
            totalMonthlyTokens: 0,
            totalDailyTokens: 0
        });
        
        return c.json({
            success: true,
            websites: allWebsitesUsage,
            totalUsage: totalUsage,
        });
    } catch (err: any) {
        console.error('Get usage error:', err);
        return c.json({
            success: false,
            error: err.message || 'Failed to get usage statistics'
        }, 500);
    }
});

aiRoute.get('/api/ai/usage/:websiteId', authMiddleware, aiUsageInfoMiddleware, async (c) => {
    const authC = c as unknown as AuthenticatedContext;
    const { websiteId } = c.req.param();
    const days = Number(c.req.query('days') || 30);
    
    try {
        const currentUsage = await AIUsageService.getUserUsageStats(authC.user.id, websiteId);
        
        const usageHistory = await AIUsageService.getWebsiteUsageHistory(
            authC.user.id, 
            websiteId, 
            days
        );
        
        const dailyUsage = await AIUsageService.getUsageByDay(
            authC.user.id, 
            websiteId, 
            days
        );
        
        const limitsCheck = await AIUsageService.checkUsageLimits(authC.user.id, websiteId);
        
        return c.json({
            success: true,
            currentUsage,
            limits: limitsCheck.limits,
            usageHistory,
            dailyUsage,
            canMakeRequest: limitsCheck.allowed,
        });
    } catch (err: any) {
        console.error('Get website usage error:', err);
        return c.json({
            success: false,
            error: err.message || 'Failed to get website usage'
        }, err.message === 'Access denied' ? 403 : 500);
    }
});

aiRoute.get('/api/ai/check-limits/:websiteId', authMiddleware, async (c) => {
    const authC = c as unknown as AuthenticatedContext;
    const { websiteId } = c.req.param();
    
    try {
        const result = await AIUsageService.checkUsageLimits(authC.user.id, websiteId);
        
        return c.json({
            success: true,
            canMakeRequest: result.allowed,
            reason: result.reason,
            usage: result.usage,
            limits: result.limits,
        });
    } catch (err: any) {
        console.error('Check request permission error:', err);
        return c.json({
            success: false,
            error: err.message || 'Failed to check request permission'
        }, 500);
    }
});


aiRoute.get('/api/ai/usage/summary', authMiddleware, async (c) => {
    const authC = c as unknown as AuthenticatedContext;
    
    try {
        const allWebsitesUsage = await AIUsageService.getUserAllWebsitesUsage(authC.user.id);
        
        const summary = allWebsitesUsage.reduce((acc, website) => {
            acc.totalMonthlyQueries += website.usage.monthlyQueries;
            acc.totalDailyQueries += website.usage.dailyQueries;
            acc.totalMonthlyTokens += website.usage.monthlyTokens;
            acc.totalDailyTokens += website.usage.dailyTokens;
            acc.websiteCount += 1;
            
            if (!acc.byPlan[website.plan]) {
                acc.byPlan[website.plan] = {
                    websites: 0,
                    monthlyQueries: 0,
                    monthlyTokens: 0
                };
            }
            acc.byPlan[website.plan].websites += 1;
            acc.byPlan[website.plan].monthlyQueries += website.usage.monthlyQueries;
            acc.byPlan[website.plan].monthlyTokens += website.usage.monthlyTokens;
            
            return acc;
        }, {
            totalMonthlyQueries: 0,
            totalDailyQueries: 0,
            totalMonthlyTokens: 0,
            totalDailyTokens: 0,
            websiteCount: 0,
            byPlan: {} as Record<string, any>
        });
        
        return c.json({
            success: true,
            summary,
            websites: allWebsitesUsage,
        });
    } catch (err: any) {
        console.error('Get usage summary error:', err);
        return c.json({
            success: false,
            error: err.message || 'Failed to get usage summary'
        }, 500);
    }
});