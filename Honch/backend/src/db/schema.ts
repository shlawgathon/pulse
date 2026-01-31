import { pgTable, uuid, varchar, boolean, timestamp, text, jsonb, inet, integer, primaryKey, uniqueIndex, index, foreignKey, pgEnum } from 'drizzle-orm/pg-core';

export const planEnum = pgEnum('plan_type', ['free', 'pro', 'enterprise']);

export const websites = pgTable('websites', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }).notNull(),
  publicId: varchar('public_id', { length: 32 }).notNull().unique(),
  plan: planEnum('plan').notNull().default('free'),
  isActive: boolean('is_active').notNull().default(true),
  timezone: varchar('timezone', { length: 100 }).notNull().default('UTC'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  publicIdIdx: uniqueIndex('websites_public_id_idx').on(table.publicId),
  domainIdx: index('websites_domain_idx').on(table.domain),
}));

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  websiteId: uuid('website_id').notNull().references(() => websites.id),
  visitorId: varchar('visitor_id', { length: 36 }).notNull(),
  sessionId: varchar('session_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 255 }), // Added for user identification
  eventType: varchar('event_type', { length: 50 }).notNull(),
  eventName: varchar('event_name', { length: 100 }),
  href: text('href'),
  referrer: text('referrer'),
  viewport: jsonb('viewport'),
  extraData: jsonb('extra_data'),
  userAgent: text('user_agent'),
  ipAddress: inet('ip_address'),
  countryCode: varchar('country_code', { length: 2 }),
  city: varchar('city', { length: 100 }),
  device: varchar('device', { length: 50 }),
  browser: varchar('browser', { length: 50 }),
  os: varchar('os', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  websiteIdIdx: index('events_website_id_idx').on(table.websiteId),
  sessionIdIdx: index('events_session_id_idx').on(table.sessionId),
  userIdIdx: index('events_user_id_idx').on(table.userId), // Index for faster lookups
  eventTypeIdx: index('events_event_type_idx').on(table.eventType),
  createdAtIdx: index('events_created_at_idx').on(table.createdAt),
}));

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  websiteId: uuid('website_id').notNull().references(() => websites.id),
  sessionId: varchar('session_id', { length: 36 }).notNull().unique(),
  visitorId: varchar('visitor_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 255 }), // Added for user identification
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  pageViews: integer('page_views').notNull().default(1),
  duration: integer('duration'),
  bounced: boolean('bounced').notNull().default(false),
  entryPage: text('entry_page'),
  exitPage: text('exit_page'),
  referrer: text('referrer'),
  countryCode: varchar('country_code', { length: 2 }),
  city: varchar('city', { length: 100 }),
  device: varchar('device', { length: 50 }),
  browser: varchar('browser', { length: 50 }),
  os: varchar('os', { length: 50 }),
}, (table) => ({
  websiteIdIdx: index('sessions_website_id_idx').on(table.websiteId),
  sessionIdIdx: uniqueIndex('sessions_session_id_idx').on(table.sessionId),
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
  startedAtIdx: index('sessions_started_at_idx').on(table.startedAt),
}));

export const sessionRecordings = pgTable('session_recordings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: varchar('session_id', { length: 36 }).notNull(), // No FK to allow async inserts
  events: jsonb('events').notNull(), // Store array of rrweb events
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sessionIdIdx: index('session_recordings_session_id_idx').on(table.sessionId),
}));

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  displayName: varchar('display_name', { length: 255 }),
  traits: jsonb('traits'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const websiteUsers = pgTable('website_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  websiteId: uuid('website_id').notNull().references(() => websites.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull().default('owner'), // owner, admin, viewer
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  websiteUserIdx: uniqueIndex('website_users_website_user_idx').on(table.websiteId, table.userId),
  websiteIdIdx: index('website_users_website_id_idx').on(table.websiteId),
  userIdIdx: index('website_users_user_id_idx').on(table.userId),
}));

export const aiUsage = pgTable('ai_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  websiteId: uuid('website_id').notNull().references(() => websites.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  queryText: text('query_text').notNull(),
  tokensUsed: integer('tokens_used').notNull().default(0),
  responseTokens: integer('response_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  modelUsed: varchar('model_used', { length: 50 }).notNull().default('o4-mini'),
  planType: planEnum('plan_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  websiteIdIdx: index('ai_usage_website_id_idx').on(table.websiteId),
  userIdIdx: index('ai_usage_user_id_idx').on(table.userId),
  createdAtIdx: index('ai_usage_created_at_idx').on(table.createdAt),
  planTypeIdx: index('ai_usage_plan_type_idx').on(table.planType),
}));

export const visitorIdentities = pgTable('visitor_identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  websiteId: uuid('website_id').notNull().references(() => websites.id, { onDelete: 'cascade' }),
  visitorId: varchar('visitor_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(), // The user ID from the client's system
  traits: jsonb('traits'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  visitorIdIdx: index('visitor_identities_visitor_id_idx').on(table.visitorId),
  userIdIdx: index('visitor_identities_user_id_idx').on(table.userId),
  websiteIdIdx: index('visitor_identities_website_id_idx').on(table.websiteId),
  uniqueVisitorWebsite: uniqueIndex('visitor_identities_visitor_website_idx').on(table.visitorId, table.websiteId),
}));

// Add userId to events table
// Note: We can't easily modify the existing table definition in place without a migration, 
// but for the schema definition we can add the field.
// Ideally, we would use a migration tool, but here we are defining the schema for Drizzle.