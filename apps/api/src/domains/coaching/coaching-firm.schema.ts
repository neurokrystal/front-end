import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';

export const coachingFirms = pgTable('coaching_firms', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  firmAdminUserId: text('firm_admin_user_id').notNull().references(() => betterAuthUser.id),
  billingEmail: text('billing_email'),
  configJson: jsonb('config_json'),                // Firm-level settings
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    adminIdx: index('coaching_firms_firm_admin_user_id_idx').on(table.firmAdminUserId),
  };
});

export const coachingFirmMemberships = pgTable('coaching_firm_memberships', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  firmId: text('firm_id').notNull().references(() => coachingFirms.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => betterAuthUser.id),
  role: text('role').notNull().default('coach'),   // 'admin' | 'coach'
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  leftAt: timestamp('left_at', { withTimezone: true }),
}, (table) => {
  return {
    firmIdx: index('coaching_firm_memberships_firm_id_idx').on(table.firmId),
    userIdIdx: index('coaching_firm_memberships_user_id_idx').on(table.userId),
  };
});
