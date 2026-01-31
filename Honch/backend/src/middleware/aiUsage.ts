import { Context, Next } from 'hono';
import { AIUsageService } from '../services/aiUsageService.js';
import { AuthenticatedContext } from './auth.js';

export interface AIRateLimitedContext extends AuthenticatedContext {
  aiUsage: {
    allowed: boolean;
    usage?: any;
    limits?: any;
    reason?: string;
  };
}

export const aiUsageLimitMiddleware = async (c: Context, next: Next) => {
  const authC = c as unknown as AuthenticatedContext;
  let websiteId: string | undefined;
  
  try {
    const body = await c.req.json().catch(() => ({}));
    websiteId = body.websiteId;
    
    if (!websiteId) {
      websiteId = c.req.param('websiteId');
    }
    
    if (!websiteId) {
      websiteId = c.req.query('websiteId');
    }
  } catch (error) {
    await next();
    return;
  }
  
  if (!websiteId) {
    return c.json({
      success: false,
      error: 'Type @website.com to specify the website you want to chat with'
    }, 400);
  }
  
  try {
    const usageCheck = await AIUsageService.checkUsageLimits(
      authC.user.id,
      websiteId
    );
    
    if (!usageCheck.allowed) {
      return c.json({
        success: false,
        error: usageCheck.reason,
        usage: usageCheck.usage,
        limits: usageCheck.limits,
        rateLimited: true
      }, 429);
    }
    
    (c as unknown as AIRateLimitedContext).aiUsage = {
      allowed: true,
      usage: usageCheck.usage,
      limits: usageCheck.limits
    };
    
    await next();
  } catch (error) {
    console.error('AI usage limit check failed:', error);
    return c.json({
      success: false,
      error: 'Failed to check usage limits'
    }, 500);
  }
};

export const aiUsageInfoMiddleware = async (c: Context, next: Next) => {
  const authC = c as unknown as AuthenticatedContext;
  
  let websiteId: string | undefined;
  
  try {
    const body = await c.req.json().catch(() => ({}));
    websiteId = body.websiteId || c.req.param('websiteId') || c.req.query('websiteId');
  } catch (error) {
    await next();
    return;
  }
  
  if (websiteId) {
    try {
      const usageCheck = await AIUsageService.checkUsageLimits(
        authC.user.id,
        websiteId
      );
      
      (c as unknown as AIRateLimitedContext).aiUsage = {
        allowed: usageCheck.allowed,
        usage: usageCheck.usage,
        limits: usageCheck.limits,
        reason: usageCheck.reason
      };
    } catch (error) {
      console.error('AI usage info check failed:', error);
    }
  }
  
  await next();
};

export const aiRequestLoggerMiddleware = async (c: Context, next: Next) => {
  const authC = c as unknown as AuthenticatedContext;
  const startTime = Date.now();
  
  console.log(`[AI Request] User: ${authC.user.id}, Time: ${new Date().toISOString()}`);
  
  await next();
  
  const duration = Date.now() - startTime;
  console.log(`[AI Request Complete] Duration: ${duration}ms`);
};