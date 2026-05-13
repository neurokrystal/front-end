import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';

export const communityMemberships = pgTable('community_memberships', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => betterAuthUser.id),
  tier: text('tier').notNull().default('standard'),  // standard, premium
  subscriptionId: text('subscription_id'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('community_memberships_user_id_idx').on(table.userId),
  };
});
