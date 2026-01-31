import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { publishToSession } from './wsHub.js';

dotenv.config();

// Support both Vertex AI (with project/location) and Gemini API (with API key)
const apiKey = process.env["GOOGLE_AI_API_KEY"] || process.env["VERTEX_AI_API_KEY"];
const projectId = process.env["GOOGLE_CLOUD_PROJECT"];
const location = process.env["GOOGLE_CLOUD_LOCATION"] || "us-central1";
const model = process.env["VERTEX_AI_MODEL"] || "gemini-2.0-flash-exp";

// Initialize with API key (Gemini API) if provided, otherwise use Vertex AI
const ai = apiKey 
  ? new GoogleGenAI({
      apiKey: apiKey,
    })
  : new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location: location,
    });

type NormalizedUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

function normalizeUsage(usage: any | undefined | null): NormalizedUsage {
  // Vertex AI usage format: { promptTokenCount, candidatesTokenCount, totalTokenCount }
  const prompt = (usage?.promptTokenCount ?? usage?.prompt_tokens ?? usage?.promptTokens ?? 0) as number;
  const completion = (usage?.candidatesTokenCount ?? usage?.completion_tokens ?? usage?.completionTokens ?? 0) as number;
  const total = (usage?.totalTokenCount ?? usage?.total_tokens ?? usage?.totalTokens ?? (prompt + completion)) as number;
  return {
    promptTokens: Number(prompt) || 0,
    completionTokens: Number(completion) || 0,
    totalTokens: Number(total) || 0,
  };
}

interface PlanningResult {
  success: boolean;
  intent: string;
  complexity: 'simple' | 'medium' | 'complex';
  requiredData: string[];
  subQuestions: string[];
  error?: string;
  usage?: NormalizedUsage;
}

interface QueryResult {
  success: boolean;
  sql: string;
  explanation: string;
  error?: string;
  usage?: NormalizedUsage;
}

interface ValidationResult {
  success: boolean;
  isSecure: boolean;
  isOptimal: boolean;
  results?: any[];
  warnings: string[];
  error?: string;
}

interface AnalysisResult {
  success: boolean;
  insights: string;
  recommendations: string[];
  markdown: string;
  error?: string;
  usage?: NormalizedUsage;
}

export class PlanningAgent {
  static async analyzeIntent(
    userQuestion: string,
    chatHistory: { role: 'user' | 'assistant'; content: string }[] = [],
    websiteContext: any
  ): Promise<PlanningResult> {
    const contextFromHistory = this.buildContextFromHistory(chatHistory);
    
    const planningPrompt = `You are the Planning Agent for Honch Analytics. Your job is to understand user intent and break down complex analytics questions into actionable components.

CONVERSATION HISTORY:
${contextFromHistory}

CURRENT QUESTION: "${userQuestion}"
WEBSITE CONTEXT: ${JSON.stringify(websiteContext)}
USER PREFERENCES (may be null): ${JSON.stringify(websiteContext?.userPreferences || null)}

ANALYSIS FRAMEWORK:

1. INTENT CLASSIFICATION:
   - Information Seeking: User wants specific data/metrics
   - Comparison: User wants to compare different segments/periods
   - Trend Analysis: User wants to understand patterns over time
   - Problem Diagnosis: User suspects an issue and wants to investigate
   - Performance Optimization: User wants actionable insights to improve
   - Prediction: User wants forecasts or projections

2. COMPLEXITY ASSESSMENT:
   - Simple: Single metric, clear timeframe, direct answer (e.g., "visitors today")
   - Medium: Multiple metrics, basic comparisons, or segmentation (e.g., "top pages vs bounce rate")
   - Complex: Multi-step analysis, correlations, funnel analysis, or predictive insights

3. CONTEXTUAL UNDERSTANDING:
   - Reference Resolution: What do "that", "those", "the same" refer to?
   - Temporal Context: What time periods are implied?
   - Metric Dependencies: What related metrics might be needed?

4. DATA REQUIREMENTS:
   - Available data types: visitors, pageviews, sessions, events, payments, referrers, pages, devices, countries, browsers, entry_pages, exit_pages, session_duration, bounce_rate

5. SUB-QUESTION BREAKDOWN:
   For complex queries, break into logical steps that build upon each other.

RESPOND WITH STRUCTURED JSON:
{
  "intent": "Clear, specific description of what user wants to achieve",
  "complexity": "simple|medium|complex",
  "requiredData": ["list", "of", "data", "types", "needed"],
  "subQuestions": ["break", "down", "complex", "questions"],
  "contextualReferences": ["any", "references", "to", "previous", "conversation"],
  "timeframe": "inferred time period if any",
  "comparisonType": "none|period|website|metric",
  "analysisType": "descriptive|diagnostic|predictive"
}

EXAMPLES:

Question: "Show me traffic for today"
Response: {
  "intent": "Get current day's website traffic metrics",
  "complexity": "simple",
  "requiredData": ["visitors", "pageviews"],
  "subQuestions": [],
  "timeframe": "today",
  "comparisonType": "none",
  "analysisType": "descriptive",
}

Question: "Why did my conversion rate drop last week compared to the week before?"
Response: {
  "intent": "Diagnose cause of conversion rate decline between two specific weeks",
  "complexity": "complex",
  "requiredData": ["payments", "visitors", "sessions", "referrers", "devices", "pages"],
  "subQuestions": [
    "Calculate conversion rates for both weeks",
    "Identify traffic source changes",
    "Analyze user behavior pattern differences",
    "Check for technical or content changes"
  ],
  "timeframe": "last two weeks",
  "comparisonType": "period",
  "analysisType": "diagnostic",
}

Return ONLY the JSON object.`;

    try {
      const systemInstruction = "You are a planning agent that analyzes user intent and returns structured JSON responses.";
      const fullPrompt = `${systemInstruction}\n\n${planningPrompt}`;
      
      const chat = ai.chats.create({
        model: model,
        config: {
          maxOutputTokens: 2000,
          systemInstruction: systemInstruction,
        }
      });

      const response = await chat.sendMessage({ message: planningPrompt });
      const content = response.text?.trim();
      
      if (!content) {
        console.error("No response from planning agent");
        console.error(response);
        return { success: false, intent: "", complexity: 'simple', requiredData: [], subQuestions: [], error: "No response from planning agent" };
      }

      // Extract JSON from response (handle markdown code blocks if present)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonContent = jsonMatch ? jsonMatch[0] : content;
      const parsed = JSON.parse(jsonContent);
      
      return {
        success: true,
        intent: parsed.intent,
        complexity: parsed.complexity,
        requiredData: parsed.requiredData,
        subQuestions: parsed.subQuestions,
        usage: normalizeUsage((response as any).usageMetadata)
      };
    } catch (error) {
      console.error("Planning Agent error:", error);
      return { 
        success: false, 
        intent: "Unable to parse intent", 
        complexity: 'simple', 
        requiredData: [], 
        subQuestions: [],
        error: "Planning analysis failed" 
      };
    }
  }

  private static buildContextFromHistory(history: { role: 'user' | 'assistant', content: string }[]): string {
    if (!history || history.length === 0) return "";
    
    const recentHistory = history.slice(-6);
    let context = "\nRECENT CONVERSATION CONTEXT:\n";
    
    for (let i = 0; i < recentHistory.length; i += 2) {
      const userMsg = recentHistory[i];
      const assistantMsg = recentHistory[i + 1];
      
      if (userMsg && userMsg.role === 'user' && assistantMsg && assistantMsg.role === 'assistant') {
        context += `User asked: "${userMsg.content}"\nAssistant responded: "${assistantMsg.content}"\n\n`;
      }
    }
    
    return context;
  }
}

export class QueryAgent {
  static async generateSQL(
    planningResult: PlanningResult,
    userQuestion: string,
    websiteFilter: string,
    chatHistory: { role: 'user' | 'assistant'; content: string }[] = []
  ): Promise<QueryResult> {
    const contextFromHistory = this.buildContextFromHistory(chatHistory);
    
    const sqlPrompt = `You are an expert PostgreSQL Query Generator for analytics data. Generate optimized, secure SQL queries.

PLANNING ANALYSIS:
- Intent: ${planningResult.intent}
- Complexity: ${planningResult.complexity}
- Required Data: ${planningResult.requiredData.join(', ')}

${contextFromHistory}

CURRENT QUESTION: "${userQuestion}"

COMPLETE DATABASE SCHEMA (ACCURATE):

**websites** table:
- id (UUID, PRIMARY KEY)
- name (VARCHAR(255), NOT NULL)
- domain (VARCHAR(255), NOT NULL) 
- public_id (VARCHAR(32), UNIQUE, NOT NULL) - use for public references
- plan (ENUM: 'free', 'pro', 'enterprise', DEFAULT 'free')
- is_active (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP WITH TIMEZONE, DEFAULT NOW())
- updated_at (TIMESTAMP WITH TIMEZONE, DEFAULT NOW())

**events** table:
- id (UUID, PRIMARY KEY)
- website_id (UUID, FK to websites.id, NOT NULL)
- visitor_id (VARCHAR(36), NOT NULL) - unique visitor identifier
- session_id (VARCHAR(36), NOT NULL) - session identifier
- event_type (VARCHAR(50), NOT NULL) - 'pageview' or 'custom'
- event_name (VARCHAR(100)) - for custom events: 'payment', 'signup', 'external_link', etc.
- href (TEXT) - page URL
- referrer (TEXT) - referring URL
- viewport (JSONB) - {width: number, height: number}
- extra_data (JSONB) - additional event data
- user_agent (TEXT)
- ip_address (INET)
- country_code (VARCHAR(2))
- city (VARCHAR(100))
- device (VARCHAR(50)) - 'mobile', 'desktop', 'tablet'
- browser (VARCHAR(50))
- os (VARCHAR(50))
- created_at (TIMESTAMP WITH TIMEZONE, DEFAULT NOW())

**sessions** table:
- id (UUID, PRIMARY KEY)
- website_id (UUID, FK to websites.id, NOT NULL)
- session_id (VARCHAR(36), UNIQUE, NOT NULL)
- visitor_id (VARCHAR(36), NOT NULL)
- started_at (TIMESTAMP WITH TIMEZONE, DEFAULT NOW())
- ended_at (TIMESTAMP WITH TIMEZONE)
- page_views (INTEGER, DEFAULT 1)
- duration (INTEGER) - in seconds
- bounced (BOOLEAN, DEFAULT false)
- entry_page (TEXT)
- exit_page (TEXT)
- referrer (TEXT)
- country_code (VARCHAR(2))
- city (VARCHAR(100))
- device (VARCHAR(50))
- browser (VARCHAR(50))
- os (VARCHAR(50))

IMPORTANT FIELD NAME MAPPINGS:
- Use website_id (NOT websiteId)
- Use visitor_id (NOT visitorId) 
- Use session_id (NOT sessionId)
- Use event_type (NOT eventType)
- Use event_name (NOT eventName)
- Use country_code (NOT countryCode)
- Use user_agent (NOT userAgent)
- Use ip_address (NOT ipAddress)
- Use extra_data (NOT extraData)
- Use created_at (NOT createdAt)
- Use started_at (NOT startedAt)
- Use ended_at (NOT endedAt)
- Use page_views (NOT pageViews)
- Use entry_page (NOT entryPage)
- Use exit_page (NOT exitPage)
- Use is_active (NOT isActive)
- Use public_id (NOT publicId)

CRITICAL RULES:

1. **SECURITY (MANDATORY):**
   - ALWAYS include: WHERE ${websiteFilter}
   - NEVER query system tables (information_schema, pg_catalog, etc.)
   - Only SELECT from events, sessions, websites tables
   - No DROP, DELETE, INSERT, UPDATE, CREATE, ALTER operations

2. **PAYMENT EVENTS (CRITICAL):**
   - Payments are stored as: event_type = 'custom' AND event_name = 'payment'
   - NEVER use event_type = 'payment' (this doesn't exist)
   - Payment queries: WHERE event_name = 'payment'
   - Payment events are in the events table, not a separate payments table
   - IMPORTANT: Only payment COUNT is tracked - NO amount/revenue data available
   - NEVER query for payment amounts, revenue totals, or average payment values

3. **PERFORMANCE OPTIMIZATION:**
   - Use indexes: website_id, created_at, session_id, event_type
   - Add LIMIT clauses for large result sets
   - Use DISTINCT carefully (it's expensive)
   - Prefer COUNT(*) over COUNT(column) when possible
   - Use date filters to limit data range

4. **POSTGRESQL SYNTAX:**
   - Use ::NUMERIC for math operations to avoid integer division
   - Handle division by zero: NULLIF(denominator, 0)
   - Date functions: CURRENT_DATE, CURRENT_TIMESTAMP, INTERVAL
   - String operations: ILIKE for case-insensitive matching
   - JSON operations: -> for objects, ->> for text

COMMON QUERY PATTERNS:

**Basic Metrics:**
- Unique visitors: COUNT(DISTINCT visitor_id) FROM events WHERE ${websiteFilter}
- Pageviews: COUNT(*) FROM events WHERE ${websiteFilter} AND event_type = 'pageview'
- Sessions: COUNT(DISTINCT session_id) FROM events WHERE ${websiteFilter}
- Payments: COUNT(*) FROM events WHERE ${websiteFilter} AND event_name = 'payment'

**Time-based Queries:**
- Today: created_at::date = CURRENT_DATE
- Yesterday: created_at::date = CURRENT_DATE - 1
- Last 7 days: created_at >= CURRENT_DATE - INTERVAL '7 days'
- This week: created_at >= date_trunc('week', CURRENT_DATE)

**Advanced Analytics:**
- Bounce rate: COUNT(*) FILTER (WHERE bounced = true)::NUMERIC / COUNT(*)::NUMERIC * 100 FROM sessions
- Conversion rate: (payments::NUMERIC / visitors::NUMERIC) * 100
- Average session duration: AVG(duration) FROM sessions WHERE duration IS NOT NULL AND duration > 0

**Geographic/Device Analysis:**
- GROUP BY country_code, device, browser for breakdowns
- ORDER BY COUNT(*) DESC for rankings
- Use LIMIT 10 for top lists

**Complex Queries:**
Use CTEs (WITH clauses) for multi-step analysis:
\`\`\`sql
WITH visitor_data AS (
  SELECT visitor_id, COUNT(*) as visits
  FROM events WHERE ${websiteFilter}
  GROUP BY visitor_id
)
SELECT AVG(visits) FROM visitor_data;
\`\`\`

RESPONSE FORMAT:
Return ONLY the SQL query. No explanations, no markdown, no extra text.

EXAMPLES FOR CONTEXT:

Question: "How many visitors today?"
SQL: SELECT COUNT(DISTINCT visitor_id) as visitors_today FROM events WHERE ${websiteFilter} AND created_at::date = CURRENT_DATE;

Question: "Top 5 countries by payment count"
SQL: SELECT country_code, COUNT(*) as payment_count FROM events WHERE ${websiteFilter} AND event_name = 'payment' AND country_code IS NOT NULL GROUP BY country_code ORDER BY COUNT(*) DESC LIMIT 5;

Question: "Compare this week vs last week visitors"
SQL: WITH this_week AS (
  SELECT COUNT(DISTINCT visitor_id) as visitors
  FROM events 
  WHERE ${websiteFilter} 
  AND created_at >= date_trunc('week', CURRENT_DATE)
), last_week AS (
  SELECT COUNT(DISTINCT visitor_id) as visitors
  FROM events 
  WHERE ${websiteFilter}
  AND created_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '1 week'
  AND created_at < date_trunc('week', CURRENT_DATE)
)
SELECT 
  tw.visitors as this_week,
  lw.visitors as last_week,
  ROUND(((tw.visitors::NUMERIC - lw.visitors::NUMERIC) / NULLIF(lw.visitors::NUMERIC, 0)) * 100, 2) as growth_percent
FROM this_week tw, last_week lw;

Generate the SQL query for the current question:`;

    try {
      const systemInstruction = "You are a SQL expert that generates secure, optimized PostgreSQL queries for analytics.";
      
      const chat = ai.chats.create({
        model: model,
        config: {
          maxOutputTokens: 5000,
          systemInstruction: systemInstruction,
        }
      });

      const response = await chat.sendMessage({ message: sqlPrompt });
      const sql = response.text?.trim();
      
      if (!sql) {
        console.error("No SQL generated");
        console.error(response);
        return { success: false, sql: "", explanation: "", error: "No SQL generated" };
      }

      // Extract SQL from response (remove markdown code blocks if present)
      const sqlMatch = sql.match(/```(?:sql)?\s*([\s\S]*?)\s*```/);
      const cleanSql = sqlMatch ? sqlMatch[1].trim() : sql;

      return {
        success: true,
        sql: cleanSql,
        explanation: `Generated SQL for: ${planningResult.intent}`,
        usage: normalizeUsage((response as any).usageMetadata)
      };
    } catch (error) {
      console.error("Query Agent error:", error);
      return { success: false, sql: "", explanation: "", error: "SQL generation failed" };
    }
  }

  private static buildContextFromHistory(history: { role: 'user' | 'assistant', content: string }[]): string {
    if (!history || history.length === 0) return "";
    
    const recentHistory = history.slice(-4);
    let context = "\nPREVIOUS QUERIES CONTEXT:\n";
    
    for (const msg of recentHistory) {
      if (msg.role === 'assistant' && msg.content.includes('SELECT')) {
        const sqlMatch = msg.content.match(/SELECT[\s\S]*?;/i);
        if (sqlMatch) {
          context += `Previous query pattern: ${sqlMatch[0].substring(0, 100)}...\n`;
        }
      }
    }
    
    return context;
  }
}

export class ValidationAgent {
  static async validateAndExecute(
    sqlQuery: string,
    websiteFilter: string,
    planningResult: PlanningResult
  ): Promise<ValidationResult> {
    const securityCheck = this.validateSQLSecurity(sqlQuery, websiteFilter);
    if (!securityCheck.isSecure) {
      console.error("Security validation failed");
      console.error(securityCheck.warnings);
      return {
        success: false,
        isSecure: false,
        isOptimal: false,
        warnings: securityCheck.warnings,
        error: "Security validation failed"
      };
    }

    const performanceCheck = this.validateSQLPerformance(sqlQuery, planningResult);

    try {
      const results = await db.execute(sql.raw(sqlQuery));
      
      return {
        success: true,
        isSecure: true,
        isOptimal: performanceCheck.isOptimal,
        results: results.rows || results,
        warnings: [...securityCheck.warnings, ...performanceCheck.warnings]
      };
    } catch (error) {
      console.error("Query execution error:", error);
      return {
        success: false,
        isSecure: true,
        isOptimal: false,
        warnings: ["Query execution failed"],
        error: `Database error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private static validateSQLSecurity(sqlQuery: string, websiteFilter: string): { isSecure: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isSecure = true;

    const upperSQL = sqlQuery.toUpperCase().replace(/\s+/g, ' ').trim();

    const forbiddenPatterns = [
      /\bINFORMATION_SCHEMA\b/i,
      /\bPG_CATALOG\b/i,
      /\bDROP\s+/i,
      /\bDELETE\s+/i,
      /\bINSERT\s+/i,
      /\bUPDATE\s+/i,
      /\bCREATE\s+/i,
      /\bALTER\s+/i,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(sqlQuery)) {
        isSecure = false;
        warnings.push(`Forbidden SQL operation detected: ${pattern.source}`);
      }
    }

    if (!sqlQuery.includes(websiteFilter)) {
      isSecure = false;
      warnings.push("Missing required website filter");
    }

    const allowedTables = ['EVENTS', 'SESSIONS', 'WEBSITES'];
    const hasAllowedTable = allowedTables.some(table => 
      upperSQL.includes(` ${table} `) || 
      upperSQL.includes(`FROM ${table}`) || 
      upperSQL.includes(`JOIN ${table}`)
    );

    if (!hasAllowedTable) {
      isSecure = false;
      warnings.push("Query must use allowed tables (events, sessions, websites)");
    }

    return { isSecure, warnings };
  }

  private static validateSQLPerformance(sqlQuery: string, planningResult: PlanningResult): { isOptimal: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isOptimal = true;

    if (planningResult.complexity === 'complex' && !sqlQuery.toUpperCase().includes('LIMIT')) {
      isOptimal = false;
      warnings.push("Consider adding LIMIT clause for better performance");
    }

    if (planningResult.requiredData.includes('time-based') && !sqlQuery.includes('created_at')) {
      warnings.push("Consider adding time-based filtering for better performance");
    }

    if (!sqlQuery.includes('website_id')) {
      warnings.push("Query should utilize website_id index");
    }

    return { isOptimal, warnings };
  }
}

export class AnalysisAgent {
  static async generateInsights(
    planningResult: PlanningResult,
    queryResult: ValidationResult,
    userQuestion: string,
    chatHistory: { role: 'user' | 'assistant'; content: string }[] = [],
    websiteContext?: any
  ): Promise<AnalysisResult> {
    const contextFromHistory = this.buildContextFromHistory(chatHistory);
    
    const analysisPrompt = `You are the Analysis Agent for Honch Analytics. Generate insightful, actionable responses with proper markdown formatting.

PLANNING CONTEXT:
- User Intent: ${planningResult.intent}
- Complexity: ${planningResult.complexity}
- Required Data: ${planningResult.requiredData.join(', ')}

${contextFromHistory}

CURRENT QUESTION: "${userQuestion}"
QUERY RESULTS: ${JSON.stringify(queryResult.results)}
VALIDATION WARNINGS: ${queryResult.warnings.join(', ')}

USER PREFERENCES (use to personalize tone, naming, and focus): ${JSON.stringify(websiteContext?.userPreferences || null)}

CONTEXT-AWARE RESPONSE GUIDELINES:
1. Reference previous data points when relevant ("This is up from the 1,234 visitors we saw yesterday")
2. Connect current results to past insights ("Remember those top pages we looked at? Here's how they're performing now")
3. Use conversational continuity ("As we discussed earlier..." or "Following up on your question about...")
4. When showing breakdowns or drill-downs, acknowledge the progression ("Let's dive deeper into that data...")
5. For comparison queries, reference the baseline from previous questions

MARKDOWN FORMATTING REQUIREMENTS:
- Use **bold** for important numbers, metrics, and key insights
- Use *italics* for emphasis and highlights
- Use \`inline code\` for specific values, percentages, and technical terms
- Use bullet points with - for lists and breakdowns
- Use ## for section headers when presenting multiple metrics
- Use > blockquotes for key takeaways or recommendations
- Use structured lists with clear labels for comparing data points
- Format large numbers with commas: 1,234 not 1234

FORMATTING EXAMPLES:
- "You had **1,234 visitors** today, which is a \`15% increase\` from yesterday"
- "## Top Performing Pages\n- *Homepage*: **2,456 views**\n- *About Page*: **892 views**"
- "> **Key Insight**: Mobile users are driving most of your traffic growth"
- "**Traffic Sources:**\n- Direct: **1,234 visitors** (\`45%\`)\n- Google: **987 visitors** (\`36%\`)\n- Social: **543 visitors** (\`19%\`)"

RESPONSE STYLE:
- Conversational and memory-aware with proper markdown formatting
- Include specific numbers from results formatted with **bold** and \`backticks\`
- Provide actionable insights in > blockquotes
- Use natural transitions that acknowledge conversation flow
- Highlight interesting patterns or changes from previous data
- Be encouraging for positive trends, constructive for improvements needed

HANDLING EMPTY OR ZERO RESULTS:
- NEVER say "Data unavailable (N/A)" or similar phrases
- When results are empty or zero, provide context: "No payments recorded yet" or "**0 payments** so far"
- For zero values, still show the metric: "**0 visitors** today" not "visitors unavailable"
- Suggest next steps: "Once you start getting traffic/payments, you'll see detailed analytics here"
- Be encouraging: "Your analytics dashboard is ready to track data as it comes in"

DATA PRESENTATION:
- Always format numbers with **bold** (e.g., **1,234 visitors**)
- Use \`backticks\` for percentages and rates (e.g., \`15% growth\`)  
- Present lists with bullet points using - for clear data breakdown
- Use structured lists with labels for comparing multiple data points
- Use ## headers to separate different metric sections
- Use > blockquotes for key recommendations
- Format comparison data as: "Label: **number** (\`percentage\`)" for consistency
- Do not use markdown tables

IMPORTANT:
- NEVER say a website id in your response
- NEVER show SQL to the user or reveal it to them
- ALWAYS use markdown formatting for better readability
- Format ALL numbers, percentages, and key metrics with appropriate markdown
- Use emojis sparingly but effectively (📈 📉 🚀 ⚡ 👥 💳)

Provide a contextually aware, conversational response with proper markdown formatting:`;

    try {
      const systemInstruction = "You are an analytics expert that provides insightful, well-formatted responses using markdown.";
      
      const chat = ai.chats.create({
        model: model,
        config: {
          maxOutputTokens: 2048,
          systemInstruction: systemInstruction,
        }
      });

      const response = await chat.sendMessage({ message: analysisPrompt });
      const insights = response.text?.trim();
      
      if (!insights) {
        console.error("No insights generated");
        console.error(response);
        return { 
          success: false, 
          insights: "", 
          recommendations: [], 
          markdown: "",
          error: "No insights generated" 
        };
      }

      const recommendations = this.extractRecommendations(insights);

      return {
        success: true,
        insights: insights,
        recommendations: recommendations,
        markdown: insights,
        usage: normalizeUsage((response as any).usageMetadata)
      };
    } catch (error) {
      console.error("Analysis Agent error:", error);
      return { 
        success: false, 
        insights: "", 
        recommendations: [], 
        markdown: "",
        error: "Analysis generation failed" 
      };
    }
  }

  private static buildContextFromHistory(history: { role: 'user' | 'assistant', content: string }[]): string {
    if (!history || history.length === 0) return "";
    
    const recentHistory = history.slice(-6);
    let context = "\nRECENT CONVERSATION CONTEXT:\n";
    
    for (let i = 0; i < recentHistory.length; i += 2) {
      const userMsg = recentHistory[i];
      const assistantMsg = recentHistory[i + 1];
      
      if (userMsg && userMsg.role === 'user' && assistantMsg && assistantMsg.role === 'assistant') {
        context += `User asked: "${userMsg.content}"\nAssistant responded: "${assistantMsg.content}"\n\n`;
      }
    }
    
    return context;
  }

  private static extractRecommendations(insights: string): string[] {
    const recommendations: string[] = [];
    
    const blockquoteMatches = insights.match(/^>\s*(.+)$/gm);
    if (blockquoteMatches) {
      recommendations.push(...blockquoteMatches.map(match => match.replace(/^>\s*/, '')));
    }
    
    const actionPhrases = insights.match(/consider\s+[^.]+|try\s+[^.]+|focus\s+on\s+[^.]+|optimize\s+[^.]+/gi);
    if (actionPhrases) {
      recommendations.push(...actionPhrases);
    }
    
    return recommendations.slice(0, 3);
  }
}

export class AnalyticsOrchestrator {
  static async processAnalyticsQuery(
    userId: string,
    websiteId: string,
    userQuestion: string,
    chatHistory: { role: 'user' | 'assistant'; content: string }[] = [],
    websiteContext: any = {},
    sessionId?: string
  ): Promise<{ success: boolean; answer?: string; error?: string; usage?: any; limits?: any; tokenUsage?: NormalizedUsage }> {
    try {
      console.log("🧠 Planning Agent: Analyzing intent...");
      if (sessionId) publishToSession(sessionId, { type: 'agent', name: 'PlanningAgent', status: 'start' });
      const planningResult = await PlanningAgent.analyzeIntent(userQuestion, chatHistory, websiteContext);
      
      if (!planningResult.success) {
        if (sessionId) publishToSession(sessionId, { type: 'agent', name: 'PlanningAgent', status: 'error', error: planningResult.error });
        return { success: false, error: planningResult.error };
      }
      
      console.log(`✅ Planning complete - Intent: ${planningResult.intent}, Complexity: ${planningResult.complexity}`);
      if (sessionId) publishToSession(sessionId, { type: 'agent', name: 'PlanningAgent', status: 'complete', data: { intent: planningResult.intent, complexity: planningResult.complexity, requiredData: planningResult.requiredData, subQuestions: planningResult.subQuestions } });
      
      const websiteFilter = `website_id = '${websiteId}'`;
      
      console.log("🔍 Query Agent: Generating SQL...");
      if (sessionId) publishToSession(sessionId, { type: 'agent', name: 'QueryAgent', status: 'start' });
      const queryResult = await QueryAgent.generateSQL(planningResult, userQuestion, websiteFilter, chatHistory);
      
      if (!queryResult.success) {
        if (sessionId) publishToSession(sessionId, { type: 'agent', name: 'QueryAgent', status: 'error', error: queryResult.error });
        return { success: false, error: queryResult.error };
      }
      
      console.log("✅ SQL generated successfully");
      if (sessionId) publishToSession(sessionId, { type: 'agent', name: 'QueryAgent', status: 'complete' });
      
      console.log("🛡️ Validation Agent: Securing and executing query...");
      if (sessionId) publishToSession(sessionId, { type: 'agent', name: 'ValidationAgent', status: 'start' });
      const validationResult = await ValidationAgent.validateAndExecute(queryResult.sql, websiteFilter, planningResult);
      
      if (!validationResult.success) {
        if (sessionId) publishToSession(sessionId, { type: 'agent', name: 'ValidationAgent', status: 'error', error: validationResult.error });
        return { success: false, error: validationResult.error };
      }
      
      console.log(`✅ Query validated and executed - Warnings: ${validationResult.warnings.length}`);
      if (sessionId) publishToSession(sessionId, { type: 'agent', name: 'ValidationAgent', status: 'complete', data: { warnings: validationResult.warnings } });
      
      console.log("📊 Analysis Agent: Generating insights...");
      if (sessionId) publishToSession(sessionId, { type: 'agent', name: 'AnalysisAgent', status: 'start' });
      const analysisResult = await AnalysisAgent.generateInsights(planningResult, validationResult, userQuestion, chatHistory, websiteContext);
      
      if (!analysisResult.success) {
        if (sessionId) publishToSession(sessionId, { type: 'agent', name: 'AnalysisAgent', status: 'error', error: analysisResult.error });
        return { success: false, error: analysisResult.error };
      }
      
      console.log("✅ Analysis complete - Insights generated");
      if (sessionId) publishToSession(sessionId, { type: 'agent', name: 'AnalysisAgent', status: 'complete' });
      
      const totalPromptTokens = (planningResult.usage?.promptTokens ?? 0)
        + (queryResult.usage?.promptTokens ?? 0)
        + (analysisResult.usage?.promptTokens ?? 0);
      const totalCompletionTokens = (planningResult.usage?.completionTokens ?? 0)
        + (queryResult.usage?.completionTokens ?? 0)
        + (analysisResult.usage?.completionTokens ?? 0);
      const totalTokens = totalPromptTokens + totalCompletionTokens;

      const answer = analysisResult.markdown;
      if (sessionId) publishToSession(sessionId, { type: 'final', answer });

      return {
        success: true,
        answer,
        tokenUsage: {
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
          totalTokens,
        }
      };
      
    } catch (error) {
      console.error("❌ Analytics Orchestrator error:", error);
      if (sessionId) publishToSession(sessionId, { type: 'error', error: 'AI architecture processing failed' });
      return {
        success: false,
        error: "AI architecture processing failed"
      };
    }
  }
}