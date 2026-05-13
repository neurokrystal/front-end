import { pgTable, text, timestamp, integer, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';
import { instrumentRuns } from '../instrument/features/run/run.schema';

export const scoreBandEnum = pgEnum('score_band', ['very_low', 'low', 'almost_balanced', 'balanced', 'high_excessive']);
export const domainEnum = pgEnum('domain_type', ['safety', 'challenge', 'play']);
export const dimensionEnum = pgEnum('dimension_type', ['self', 'others', 'past', 'future', 'senses', 'perception']);
export const alignmentDirectionEnum = pgEnum('alignment_direction', ['masking_upward', 'masking_downward', 'aligned']);
export const alignmentSeverityEnum = pgEnum('alignment_severity', ['aligned', 'mild_divergence', 'significant_divergence', 'severe_divergence']);

export const scoredProfiles = pgTable('scored_profiles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => betterAuthUser.id),
  instrumentRunId: text('instrument_run_id').notNull().unique().references(() => instrumentRuns.id),
  scoringStrategyKey: text('scoring_strategy_key').notNull(),              // Which strategy produced this
  scoringStrategyVersion: integer('scoring_strategy_version').notNull(),   // Version of that strategy

  // Denormalised top-level scores for queryability (filtering, aggregation)
  safetyBand: text('safety_band').notNull(),
  challengeBand: text('challenge_band').notNull(),
  playBand: text('play_band').notNull(),

  // Full structured profile as JSONB — the canonical scored output
  profilePayload: jsonb('profile_payload').notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('scored_profiles_user_id_idx').on(table.userId),
  };
});
