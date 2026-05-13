import { pgTable, text, timestamp, integer, jsonb, pgEnum, boolean, index } from 'drizzle-orm/pg-core';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';
import { teams } from '../organization/features/team/team.schema';

export const programmeStatusEnum = pgEnum('programme_status', ['draft', 'active', 'archived']);

export const programmes = pgTable('programmes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  targetDomain: text('target_domain'),                // 'safety' | 'challenge' | 'play' | null (cross-domain)
  status: programmeStatusEnum('status').notNull().default('draft'),
  durationWeeks: integer('duration_weeks'),
  modulesJson: jsonb('modules_json'),                  // Structured module definitions
  configJson: jsonb('config_json'),                    // Programme-level settings
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const programmeEnrolmentStatusEnum = pgEnum('programme_enrolment_status', [
  'enrolled', 'in_progress', 'completed', 'withdrawn',
]);

export const programmeEnrolments = pgTable('programme_enrolments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  programmeId: text('programme_id').notNull().references(() => programmes.id),
  userId: text('user_id').references(() => betterAuthUser.id),       // Individual enrolment
  teamId: text('team_id').references(() => teams.id),                 // Team enrolment (one of userId or teamId)
  status: programmeEnrolmentStatusEnum('status').notNull().default('enrolled'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  progressJson: jsonb('progress_json'),                // Module completion states, reflection responses
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    programmeIdIdx: index('programme_enrolments_programme_id_idx').on(table.programmeId),
    userIdIdx: index('programme_enrolments_user_id_idx').on(table.userId),
    teamIdIdx: index('programme_enrolments_team_id_idx').on(table.teamId),
  };
});
