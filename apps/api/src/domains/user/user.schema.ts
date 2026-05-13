import { pgTable, text, timestamp, pgEnum, jsonb, index } from 'drizzle-orm/pg-core';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';

export const userProfileTypeEnum = pgEnum('user_profile_type', ['full', 'viewer']);

export const userProfiles = pgTable('user_profiles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().unique().references(() => betterAuthUser.id, { onDelete: 'cascade' }),
  profileType: userProfileTypeEnum('profile_type').notNull().default('full'),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const deletionRequests = pgTable('deletion_requests', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => betterAuthUser.id),
  status: text('status').notNull().default('pending'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
  executedAt: timestamp('executed_at', { withTimezone: true }),
  executedBy: text('executed_by'),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  deletionReport: jsonb('deletion_report'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('deletion_requests_user_id_idx').on(table.userId),
  };
});
