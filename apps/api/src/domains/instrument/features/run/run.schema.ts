import { pgTable, text, timestamp, integer, jsonb, pgEnum, unique, index } from 'drizzle-orm/pg-core';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';
import { instrumentVersions, instrumentItems } from '../../instrument.schema';

export const runStatusEnum = pgEnum('run_status', ['in_progress', 'completed', 'abandoned', 'flagged']);

export const instrumentRuns = pgTable('instrument_runs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => betterAuthUser.id),
  ratedByUserId: text('rated_by_user_id').references(() => betterAuthUser.id), // Null for self-assessment
  instrumentVersionId: text('instrument_version_id').notNull().references(() => instrumentVersions.id),
  status: runStatusEnum('status').notNull().default('in_progress'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  scoredProfileId: text('scored_profile_id'), // Set after scoring
  consistencyScore: integer('consistency_score'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('instrument_runs_user_id_idx').on(table.userId),
    ratedByIdx: index('instrument_runs_rated_by_user_id_idx').on(table.ratedByUserId),
    versionIdIdx: index('instrument_runs_version_id_idx').on(table.instrumentVersionId),
    statusIdx: index('instrument_runs_status_idx').on(table.status),
  };
});

export const instrumentResponses = pgTable('instrument_responses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  runId: text('run_id').notNull().references(() => instrumentRuns.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull().references(() => instrumentItems.id),
  responseValue: integer('response_value'),
  responseText: text('response_text'),
  answeredAt: timestamp('answered_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    runItemUnique: unique('run_item_unique').on(table.runId, table.itemId),
    itemIdIdx: index('instrument_responses_item_id_idx').on(table.itemId),
  };
});
