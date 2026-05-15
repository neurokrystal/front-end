import { pgTable, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import crypto from 'node:crypto';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';

export const assets = pgTable(
  'assets',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    description: text('description'),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    fileExtension: text('file_extension').notNull(),
    fileSizeBytes: integer('file_size_bytes').notNull(),
    environment: text('environment').notNull().default('production'),
    storagePath: text('storage_path').notNull(),
    publicUrl: text('public_url').notNull(),
    category: text('category'),
    uploadedBy: text('uploaded_by').references(() => betterAuthUser.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('assets_name_idx').on(table.name),
    index('assets_environment_idx').on(table.environment),
    index('assets_mime_type_idx').on(table.mimeType),
  ],
);

// Note: Indexes are defined within the pgTable callback above.

export type AssetRow = typeof assets.$inferSelect;
export type NewAssetRow = typeof assets.$inferInsert;
