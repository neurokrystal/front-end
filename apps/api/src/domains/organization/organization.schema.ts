import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { betterAuthOrganization } from '@/infrastructure/auth/better-auth-refs.schema';

export const organizationExtensions = pgTable('organization_extensions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().unique().references(() => betterAuthOrganization.id, { onDelete: 'cascade' }),
  description: text('description'),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
