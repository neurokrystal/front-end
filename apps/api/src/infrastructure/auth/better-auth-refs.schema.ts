import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

// Reference stub — NOT a migration target, just for FK references in Drizzle
export const betterAuthUser = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  role: text('role'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const betterAuthOrganization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  logo: text('logo'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const betterAuthSession = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => betterAuthUser.id),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const betterAuthAccount = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => betterAuthUser.id),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});
