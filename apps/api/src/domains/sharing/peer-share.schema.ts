import { pgTable, text, timestamp, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';

export const peerShareDirectionEnum = pgEnum('peer_share_direction', [
  'one_way',       // Party A shares with Party B, not reciprocal
  'mutual',        // Both parties share with each other
]);

export const peerShareStatusEnum = pgEnum('peer_share_status', [
  'pending',       // Invitation sent, not yet accepted
  'active',        // Both parties have accepted
  'revoked',       // One party revoked
  'expired',       // Time-bounded share expired
]);

export const peerShares = pgTable('peer_shares', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  initiatorUserId: text('initiator_user_id').notNull().references(() => betterAuthUser.id),
  recipientUserId: text('recipient_user_id').references(() => betterAuthUser.id),
  recipientEmail: text('recipient_email'),
  direction: peerShareDirectionEnum('direction').notNull().default('one_way'),
  status: peerShareStatusEnum('status').notNull().default('pending'),
  inviteToken: text('invite_token').unique(),          // Secure token for accepting the share
  expiresAt: timestamp('expires_at', { withTimezone: true }),   // Null = indefinite
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokedByUserId: text('revoked_by_user_id').references(() => betterAuthUser.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
