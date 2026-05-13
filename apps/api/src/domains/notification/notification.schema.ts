import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';

export const notificationLogs = pgTable('notification_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => betterAuthUser.id),
  notificationType: text('notification_type').notNull(),
  content: jsonb('content'),
  metadata: jsonb('metadata'),
  status: text('status').notNull().default('sent'), // 'sent', 'failed'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('notification_logs_user_id_idx').on(table.userId),
  };
});

export const emailTemplates = pgTable('email_templates', {
  id: text('id').primaryKey(), // Using event type as ID for simplicity
  subject: text('subject').notNull(),
  body_text: text('body_text').notNull(),
  body_html: text('body_html').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
