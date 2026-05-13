import { pgTable, text, timestamp, jsonb, pgEnum, boolean, index } from 'drizzle-orm/pg-core';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';
import { scoredProfiles } from '../scoring/scoring.schema';

export const reportAudienceEnum = pgEnum('report_audience', ['subject_facing', 'viewer_facing', 'aggregate']);

export const reports = pgTable('reports', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  reportType: text('report_type').notNull(),                              // From REPORT_TYPES
  audience: reportAudienceEnum('audience').notNull(),
  subjectUserId: text('subject_user_id').notNull().references(() => betterAuthUser.id),  // Whose profile this is about
  viewerUserId: text('viewer_user_id').references(() => betterAuthUser.id),               // Who is viewing (null = subject themselves)
  primaryScoredProfileId: text('primary_scored_profile_id').notNull().references(() => scoredProfiles.id),
  secondaryScoredProfileId: text('secondary_scored_profile_id').references(() => scoredProfiles.id),  // For comparison reports
  contentVersionId: text('content_version_id'),                           // Which CMS content version was used
  renderedPayload: jsonb('rendered_payload'),                             // Cached rendered content blocks
  status: text('status').notNull().default('active'),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    subjectIdx: index('reports_subject_user_id_idx').on(table.subjectUserId),
    viewerIdx: index('reports_viewer_user_id_idx').on(table.viewerUserId),
    primaryProfileIdx: index('reports_primary_scored_profile_id_idx').on(table.primaryScoredProfileId),
    secondaryProfileIdx: index('reports_secondary_scored_profile_id_idx').on(table.secondaryScoredProfileId),
    statusIdx: index('reports_status_idx').on(table.status),
  };
});
