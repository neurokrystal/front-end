import { pgTable, text, timestamp, pgEnum, jsonb, index } from 'drizzle-orm/pg-core';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';

export const certificationStatusEnum = pgEnum('certification_status', [
  'active', 'lapsed', 'suspended', 'revoked',
]);

export const certificationRecords = pgTable('certification_records', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  coachUserId: text('coach_user_id').notNull().references(() => betterAuthUser.id),
  programmeName: text('programme_name').notNull(),       // Which certification programme
  status: certificationStatusEnum('status').notNull().default('active'),
  certifiedAt: timestamp('certified_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  suspendedAt: timestamp('suspended_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  qualifyingAssessmentData: jsonb('qualifying_assessment_data'),  // References to their own scored profiles used for qualification
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    coachIdx: index('certification_records_coach_user_id_idx').on(table.coachUserId),
  };
});
