import { db, websites, events, sessions, visitorIdentities } from '../db/index.js';
import { parseUserAgent } from '../utils/userAgent.js';
import { getGeo } from '../utils/geoip.js';
import { eq, and } from 'drizzle-orm';
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
  ipAddress: z.string().nullable().optional(),
  userId: z.string().optional(),
  traits: z.record(z.any()).optional(),
});

interface BatchedEvent {
  data: z.infer<typeof eventSchema>;
  receivedAt: Date;
}

interface SessionData {
  sessionId: string;
  websiteId: string;
  visitorId: string;
  startedAt: Date;
  pageViews: number;
  entryPage: string;
  exitPage: string;
  referrer: string;
  countryCode: string;
  city: string;
  device: string;
  browser: string;
  os: string;
  lastEventAt: Date;
  userId?: string | null;
}

export class EventBatchingService {
  private static instance: EventBatchingService;
  private eventBatch: BatchedEvent[] = [];
  private sessionCache: Map<string, SessionData> = new Map();
  private websiteCache: Map<string, any> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 20; // Flush after 100 events
  private readonly FLUSH_INTERVAL_MS = 60000; // Flush every 60 seconds
  private readonly MAX_BATCH_SIZE = 500; // Emergency flush at 500 events
  private isProcessing = false;

  private constructor() {
    this.startFlushInterval();
  }

  static getInstance(): EventBatchingService {
    if (!EventBatchingService.instance) {
      EventBatchingService.instance = new EventBatchingService();
    }
    return EventBatchingService.instance;
  }

  /**
   * Add an event to the batch queue
   */
  async addEvent(input: unknown): Promise<{ success: boolean; queued: boolean }> {
    try {
      const data = eventSchema.parse(input);

      this.eventBatch.push({
        data,
        receivedAt: new Date()
      });

      console.log(`Event queued. Batch size: ${this.eventBatch.length}/${this.BATCH_SIZE}`);

      // Emergency flush if batch gets too large
      if (this.eventBatch.length >= this.MAX_BATCH_SIZE) {
        console.warn(`Emergency flush triggered at ${this.eventBatch.length} events`);
        setImmediate(() => this.flush());
      }
      // Regular flush at batch size threshold
      else if (this.eventBatch.length >= this.BATCH_SIZE) {
        console.log(`Batch size reached. Triggering flush...`);
        setImmediate(() => this.flush());
      }

      return { success: true, queued: true };
    } catch (error) {
      console.error('Event validation error:', error);
      throw error;
    }
  }

  /**
   * Start the automatic flush interval
   */
  private startFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(() => {
      if (this.eventBatch.length > 0) {
        console.log(`Time-based flush triggered with ${this.eventBatch.length} events`);
        this.flush();
      }
    }, this.FLUSH_INTERVAL_MS);

    console.log(`Event batching service started (flush every ${this.FLUSH_INTERVAL_MS / 1000}s or ${this.BATCH_SIZE} events)`);
  }

  /**
   * Flush all batched events to the database
   */
  async flush(): Promise<void> {
    if (this.isProcessing) {
      console.log('Flush already in progress, skipping...');
      return;
    }

    if (this.eventBatch.length === 0) {
      return;
    }

    this.isProcessing = true;
    const eventsToProcess = [...this.eventBatch];
    this.eventBatch = [];

    console.log(`Flushing ${eventsToProcess.length} events to database...`);

    try {
      await this.processBatch(eventsToProcess);
      console.log(`Successfully flushed ${eventsToProcess.length} events`);
    } catch (error) {
      console.error('Error flushing events:', error);
      // Re-add failed events to the batch (at the beginning)
      this.eventBatch.unshift(...eventsToProcess);
      console.log(`Re-queued ${eventsToProcess.length} failed events`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a batch of events efficiently
   */
  private async processBatch(batch: BatchedEvent[]): Promise<void> {
    const startTime = Date.now();

    // Group events by website to minimize lookups
    const eventsByWebsite = new Map<string, BatchedEvent[]>();
    for (const event of batch) {
      const publicId = event.data.websiteId;
      if (!eventsByWebsite.has(publicId)) {
        eventsByWebsite.set(publicId, []);
      }
      eventsByWebsite.get(publicId)!.push(event);
    }

    // Pre-fetch all required websites
    await this.prefetchWebsites(Array.from(eventsByWebsite.keys()));

    // Process events in parallel by website
    const processPromises = Array.from(eventsByWebsite.entries()).map(
      ([publicId, websiteEvents]) => this.processWebsiteEvents(publicId, websiteEvents)
    );

    await Promise.all(processPromises);

    // Clean up old session cache entries (older than 1 hour)
    this.cleanupSessionCache();

    const duration = Date.now() - startTime;
    console.log(`Batch processing completed in ${duration}ms`);
  }

  /**
   * Pre-fetch websites to minimize database queries
   */
  private async prefetchWebsites(publicIds: string[]): Promise<void> {
    const uncachedIds = publicIds.filter(id => !this.websiteCache.has(id));

    if (uncachedIds.length === 0) {
      return;
    }

    console.log(`Fetching ${uncachedIds.length} websites from database...`);

    // Fetch all uncached websites in one query
    const websitesData = await Promise.all(
      uncachedIds.map(publicId =>
        db.query.websites.findFirst({
          where: eq(websites.publicId, publicId),
        })
      )
    );

    // Cache the results
    websitesData.forEach((website, index) => {
      if (website && website.isActive) {
        this.websiteCache.set(uncachedIds[index], website);
      }
    });

    console.log(`Cached ${websitesData.filter(w => w).length} websites`);
  }

  /**
   * Process all events for a specific website
   */
  private async processWebsiteEvents(
    publicId: string,
    websiteEvents: BatchedEvent[]
  ): Promise<void> {
    const website = this.websiteCache.get(publicId);
    if (!website || !website.isActive) {
      console.warn(`Skipping ${websiteEvents.length} events for inactive/unknown website: ${publicId}`);
      return;
    }

    // Group events by session
    const eventsBySession = new Map<string, BatchedEvent[]>();
    for (const event of websiteEvents) {
      const sessionId = event.data.sessionId;
      if (!eventsBySession.has(sessionId)) {
        eventsBySession.set(sessionId, []);
      }
      eventsBySession.get(sessionId)!.push(event);
    }

    // Process sessions in parallel
    const sessionPromises = Array.from(eventsBySession.entries()).map(
      ([sessionId, sessionEvents]) =>
        this.processSessionEvents(website, sessionId, sessionEvents)
    );

    await Promise.all(sessionPromises);
  }

  /**
   * Process all events for a specific session
   */
  private async processSessionEvents(
    website: any,
    sessionId: string,
    sessionEvents: BatchedEvent[]
  ): Promise<void> {
    // Sort events by received time
    sessionEvents.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());

    const firstEvent = sessionEvents[0].data;
    const lastEvent = sessionEvents[sessionEvents.length - 1].data;

    // Parse user agent and get geo data from first event
    const { browser, os, device } = parseUserAgent(firstEvent.userAgent);
    const { countryCode, city } = await getGeo(firstEvent.ipAddress || '');

    // Check if session exists in cache
    let sessionData = this.sessionCache.get(sessionId);

    if (!sessionData) {
      // Check database for existing session
      const existingSession = await db.query.sessions.findFirst({
        where: eq(sessions.sessionId, sessionId),
      });

      if (existingSession) {
        sessionData = {
          sessionId: existingSession.sessionId,
          websiteId: website.id,
          visitorId: existingSession.visitorId,
          startedAt: existingSession.startedAt,
          pageViews: existingSession.pageViews || 1,
          entryPage: existingSession.entryPage || firstEvent.href,
          exitPage: lastEvent.href,
          referrer: existingSession.referrer || firstEvent.referrer || '',
          countryCode,
          city,
          device,
          browser,
          os,
          lastEventAt: new Date(),
          userId: existingSession.userId
        };
      } else {
        // Create new session data
        // Try to find existing userId for this visitor from visitorIdentities
        const identity = await db.query.visitorIdentities.findFirst({
          where: and(
            eq(visitorIdentities.visitorId, firstEvent.visitorId),
            eq(visitorIdentities.websiteId, website.id)
          )
        });

        sessionData = {
          sessionId,
          websiteId: website.id,
          visitorId: firstEvent.visitorId,
          startedAt: sessionEvents[0].receivedAt,
          pageViews: 0,
          entryPage: firstEvent.href,
          exitPage: lastEvent.href,
          referrer: firstEvent.referrer || '',
          countryCode,
          city,
          device,
          browser,
          os,
          lastEventAt: new Date(),
          userId: identity?.userId
        };

        // Insert new session
        await db.insert(sessions).values({
          websiteId: website.id,
          sessionId,
          visitorId: firstEvent.visitorId,
          userId: sessionData.userId,
          startedAt: sessionData.startedAt,
          pageViews: 1,
          entryPage: sessionData.entryPage,
          referrer: sessionData.referrer,
          countryCode,
          city,
          device,
          browser,
          os,
        });
      }

      this.sessionCache.set(sessionId, sessionData);
    }

    // Check for identify events or userId in the current batch
    const identifyEvent = sessionEvents.find(e => e.data.userId);
    if (identifyEvent && identifyEvent.data.userId) {
      const userId = identifyEvent.data.userId;
      const traits = identifyEvent.data.traits;

      // Update session data
      sessionData.userId = userId;

      // Persist identity
      await db.insert(visitorIdentities).values({
        websiteId: website.id,
        visitorId: firstEvent.visitorId,
        userId,
        traits: traits || {},
      }).onConflictDoUpdate({
        target: [visitorIdentities.visitorId, visitorIdentities.websiteId],
        set: {
          userId,
          traits: traits || undefined,
          updatedAt: new Date(),
        }
      });

      // Update session in DB with new User ID
      await db.update(sessions)
        .set({ userId })
        .where(eq(sessions.sessionId, sessionId));
    }

    // Update session data with new events
    sessionData.pageViews += sessionEvents.length;
    sessionData.exitPage = lastEvent.href;
    sessionData.lastEventAt = new Date();

    // Calculate session duration
    const duration = Math.floor(
      (sessionData.lastEventAt.getTime() - sessionData.startedAt.getTime()) / 1000
    );

    // Update session in database
    await db.update(sessions)
      .set({
        pageViews: sessionData.pageViews,
        endedAt: sessionData.lastEventAt,
        duration,
        exitPage: sessionData.exitPage,
        countryCode,
        city,
        device,
        browser,
        os,
      })
      .where(eq(sessions.sessionId, sessionId));

    // Prepare event records for bulk insert
    const eventRecords = sessionEvents.map(event => ({
      websiteId: website.id,
      visitorId: event.data.visitorId,
      sessionId: event.data.sessionId,
      eventType: event.data.eventType,
      eventName: event.data.eventName,
      href: event.data.href,
      referrer: event.data.referrer || '',
      viewport: event.data.viewport,
      extraData: event.data.extraData || {},
      userAgent: event.data.userAgent,
      ipAddress: event.data.ipAddress || null,
      countryCode,
      city,
      device,
      browser,
      os,
      createdAt: event.receivedAt,
      userId: event.data.userId || sessionData.userId, // Use event-specific ID or session-level ID
    }));

    // Bulk insert all events
    if (eventRecords.length > 0) {
      await db.insert(events).values(eventRecords);
    }
  }

  /**
   * Clean up old entries from session cache
   */
  private cleanupSessionCache(): void {
    const ONE_HOUR_AGO = Date.now() - 60 * 60 * 1000;
    let cleanedCount = 0;

    for (const [sessionId, sessionData] of this.sessionCache.entries()) {
      if (sessionData.lastEventAt.getTime() < ONE_HOUR_AGO) {
        this.sessionCache.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old session cache entries`);
    }
  }

  /**
   * Get current batch status
   */
  getBatchStatus(): {
    queuedEvents: number;
    isProcessing: boolean;
    cachedSessions: number;
    cachedWebsites: number;
  } {
    return {
      queuedEvents: this.eventBatch.length,
      isProcessing: this.isProcessing,
      cachedSessions: this.sessionCache.size,
      cachedWebsites: this.websiteCache.size,
    };
  }

  /**
   * Force immediate flush (for graceful shutdown)
   */
  async forceFlush(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }

  /**
   * Shutdown the service gracefully
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down event batching service...');
    await this.forceFlush();
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    console.log('Event batching service shutdown complete');
  }
}

// Export singleton instance
export const eventBatchingService = EventBatchingService.getInstance();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await eventBatchingService.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await eventBatchingService.shutdown();
  process.exit(0);
});