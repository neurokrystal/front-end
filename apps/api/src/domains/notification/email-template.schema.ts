import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const emailTemplates = pgTable('email_templates', {
  id: text('id').primaryKey(), // Using string ID like 'user_registered'
  subject: text('subject').notNull(),
  locale: text('locale').notNull().default('en'),
  body_text: text('body_text').notNull(),
  body_html: text('body_html').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
