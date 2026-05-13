import { pgTable, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const reportContentBlocks = pgTable('report_content_blocks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  reportType: text('report_type').notNull(),           // Which report this block belongs to
  sectionKey: text('section_key').notNull(),            // e.g., 'domain_overview', 'felt_state', 'expressed_state', 'alignment', 'dimension'
  domain: text('domain'),                               // Nullable — some blocks are domain-specific
  dimension: text('dimension'),                         // Nullable — some blocks are dimension-specific
  scoreBand: text('score_band'),                        // Nullable — band-specific content
  secondaryScoreBand: text('secondary_score_band'),       // Nullable — for comparison reports (User B band)
  alignmentDirection: text('alignment_direction'),      // Nullable — for alignment blocks
  alignmentSeverity: text('alignment_severity'),        // Nullable — for alignment blocks
  locale: text('locale').notNull().default('en'),
  contentText: text('content_text').notNull(),           // The actual report copy
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata'),                          // Extra config (formatting hints, conditional display rules)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CmsContentBlock = typeof reportContentBlocks.$inferSelect;

// Version tracking for CMS content changes
export const reportContentVersions = pgTable('report_content_versions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  reportType: text('report_type').notNull(),
  versionNumber: integer('version_number').notNull(),
  changeDescription: text('change_description'),
  publishedBy: text('published_by'),                    // Admin user who published
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  snapshotJson: jsonb('snapshot_json'),                 // Full snapshot of all blocks at this version
});
