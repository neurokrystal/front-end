import { pgTable, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';

export const coachClientLinkStatusEnum = pgEnum('coach_client_link_status', [
  'pending', 'active', 'paused', 'ended', 'suspended',
]);

export const coachClientLinks = pgTable('coach_client_links', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  coachUserId: text('coach_user_id').notNull().references(() => betterAuthUser.id),
  clientUserId: text('client_user_id').references(() => betterAuthUser.id), // Nullable for invites
  clientEmail: text('client_email'), // For initial invite
  inviteToken: text('invite_token'),
  status: coachClientLinkStatusEnum('status').notNull().default('pending'),
  // The coach's access to client data is gated by BOTH this link being active
  // AND the coach having an active certification record
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    coachIdx: index('coach_client_links_coach_user_id_idx').on(table.coachUserId),
    clientIdx: index('coach_client_links_client_user_id_idx').on(table.clientUserId),
  };
});
