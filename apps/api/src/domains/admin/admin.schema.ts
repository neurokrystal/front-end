import { pgTable, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';

export const bulkOperations = pgTable('bulk_operations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  adminUserId: text('admin_user_id').notNull().references(() => betterAuthUser.id),
  operation: text('operation').notNull(),
  targetCount: integer('target_count').notNull(),
  completedCount: integer('completed_count').notNull().default(0),
  failedCount: integer('failed_count').notNull().default(0),
  status: text('status').notNull().default('pending'),  // pending, running, completed, failed
  reason: text('reason').notNull(),
  resultJson: jsonb('result_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => {
  return {
    adminIdx: index('bulk_operations_admin_user_id_idx').on(table.adminUserId),
  };
});
