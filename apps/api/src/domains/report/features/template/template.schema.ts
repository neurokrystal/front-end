// domains/report/features/template/template.schema.ts
import { pgTable, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core';

export const reportTemplates = pgTable('report_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  reportType: text('report_type').notNull(),
  name: text('name').notNull(),
  version: integer('version').notNull(),
  templateJson: jsonb('template_json').notNull(),       // The full ReportTemplate definition
  isActive: boolean('is_active').notNull().default(false),
  isDefault: boolean('is_default').notNull().default(false),  // The default template for this report type
  thumbnailUrl: text('thumbnail_url'),                   // Preview image for the editor
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
