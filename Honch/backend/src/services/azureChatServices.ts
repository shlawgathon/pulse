import dotenv from "dotenv";
import { db, userPreferences } from "../db/index.js";
import { AIUsageService } from "./aiUsageService.js";
import { AnalyticsOrchestrator } from "./aiAgents.js";
import { sql } from "drizzle-orm";

dotenv.config();

const model = process.env["VERTEX_AI_MODEL"] || "gemini-2.0-flash-exp";

export async function askAnalyticsAssistant(
  userId: string,
  websiteId: string,
  userQuestion: string,
  chatHistory: { role: 'user' | 'assistant', content: string }[] = [],
  sessionId?: string
): Promise<{ success: boolean; answer?: string; error?: string; usage?: any; limits?: any }> {

  const usageCheck = await AIUsageService.checkUsageLimits(userId, websiteId);
  
  if (!usageCheck.allowed) {
    return {
      success: false,
      error: usageCheck.reason,
      usage: usageCheck.usage,
      limits: usageCheck.limits
    };
  }

  if (detectSchemaRequest(userQuestion)) {
    await AIUsageService.recordUsage(
      userId,
      websiteId,
      userQuestion,
      0,
      0,
      model
    );

    return {
      success: false,
      error: "I can only help with analytics questions about your website data like visitor counts, page views, traffic sources, and user behavior. I can't provide information about database structure or schema."
    };
  }

  try {
    const websiteContext = await getWebsiteContext(userId, websiteId);
    
    if (!websiteContext) {
      return {
        success: false,
        error: "Sorry, you do not have access to this website's analytics."
      };
    }
    
    const result = await AnalyticsOrchestrator.processAnalyticsQuery(
      userId,
      websiteId,
      userQuestion,
      chatHistory,
      websiteContext,
      sessionId
    );

    const promptTokens = result.tokenUsage?.promptTokens ?? 0;
    const completionTokens = result.tokenUsage?.completionTokens ?? 0;

    await AIUsageService.recordUsage(
      userId,
      websiteId,
      userQuestion,
      promptTokens,
      completionTokens,
      model
    );
    
    return {
      success: true,
      answer: result.answer,
      usage: usageCheck.usage,
      limits: usageCheck.limits
    };

  } catch (error) {
    console.error("❌ Analytics Assistant error:", error);
    return {
      success: false,
      error: "An error occurred while processing your request. Please try again later."
    };
  }
}

/**
 * Get website context for better AI analysis
 */
async function getWebsiteContext(userId: string, websiteId: string) {
  try {
    // Check access
    const access = await db.query.websiteUsers.findFirst({
      where: (fields: any, { eq, and }: any) => and(
        eq(fields.userId, userId),
        eq(fields.websiteId, websiteId)
      ),
    });

    if (!access) {
      return null;
    }

    // Get website details
    const website = await db.query.websites.findFirst({ 
      where: (fields: any, { eq }: any) => eq(fields.id, websiteId),
      columns: { id: true, domain: true, name: true, plan: true }
    });

    // Get user preferences
    const prefs = await db.query.userPreferences.findFirst({
      where: (fields: any, { eq }: any) => eq(fields.userId, userId),
      columns: { displayName: true, traits: true, notes: true }
    });

    return { ...website, userPreferences: prefs };
  } catch (error) {
    console.error("Error getting website context:", error);
    return null;
  }
}

/**
 * Detect if user is asking for schema/system information
 */
function detectSchemaRequest(question: string): boolean {
  const lowerQuestion = question.toLowerCase();
  const schemaKeywords = [
    'table names', 'show tables', 'list tables', 'database schema', 'table structure',
    'columns in', 'describe table', 'show columns', 'information_schema',
    'what tables', 'database structure', 'schema', 'table list'
  ];
  
  return schemaKeywords.some(keyword => lowerQuestion.includes(keyword));
}