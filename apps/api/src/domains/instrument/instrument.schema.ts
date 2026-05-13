import { pgTable, text, timestamp, integer, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';

export const instrumentStatusEnum = pgEnum('instrument_status', ['draft', 'active', 'retired']);
export const itemResponseFormatEnum = pgEnum('item_response_format', ['likert_5', 'likert_7', 'binary', 'free_text']);

export const instruments = pgTable('instruments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: text('slug').notNull().unique(),           // e.g., 'base-diagnostic'
  name: text('name').notNull(),                     // e.g., 'Base Diagnostic (66-item)'
  description: text('description'),
  status: instrumentStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const instrumentVersions = pgTable('instrument_versions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  instrumentId: text('instrument_id').notNull().references(() => instruments.id),
  versionNumber: integer('version_number').notNull(),       // Monotonically increasing per instrument
  itemCount: integer('item_count').notNull(),
  scoringStrategyKey: text('scoring_strategy_key').notNull(), // Key into the scoring strategy registry
  configJson: jsonb('config_json'),                          // Instrument-level config
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    instrumentIdIdx: index('instrument_versions_instrument_id_idx').on(table.instrumentId),
  };
});

export const instrumentItems = pgTable('instrument_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  instrumentVersionId: text('instrument_version_id').notNull().references(() => instrumentVersions.id),
  ordinal: integer('ordinal').notNull(),                     // Display order
  itemText: text('item_text').notNull(),                     // The question/statement
  locale: text('locale').notNull().default('en'),           // 'en', 'fr', etc.
  responseFormat: itemResponseFormatEnum('response_format').notNull().default('likert_5'),
  domainTag: text('domain_tag'),                             // 'safety', 'challenge', 'play'
  dimensionTag: text('dimension_tag'),                       // 'self', 'others', etc.
  stateTag: text('state_tag'),                               // 'felt' or 'expressed' (deprecated)
  categoryTag: text('category_tag'),                         // 'feelings', 'behaviours', 'beliefs', 'general', 'dimension', 'excess'
  scoreGroupTag: text('score_group_tag'),                   // Which score group this item belongs to
  configJson: jsonb('config_json').$type<{ reverseScored?: boolean; weight?: number } | null>(),                          // Item-level config
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    versionIdIdx: index('instrument_items_version_id_idx').on(table.instrumentVersionId),
  };
});
