import { pgTable, text, timestamp, pgEnum, jsonb, index } from 'drizzle-orm/pg-core';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';
import { teams } from '../organization/features/team/team.schema';
import { betterAuthOrganization } from '@/infrastructure/auth/better-auth-refs.schema';

export const shareTargetTypeEnum = pgEnum('share_target_type', [
  'user',           // Sharing with a specific person
  'team',           // Sharing with everyone on a team (current and future members)
  'organisation',   // Sharing with the entire org (for aggregate views)
  'coach',          // Sharing with a coach (resolved via coach-client link)
  'public',         // Future: public/community sharing
]);

export const shareGrantStatusEnum = pgEnum('share_grant_status', [
  'active',
  'revoked',
  'expired',
]);

export const shareGrants = pgTable('share_grants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  // WHO is sharing (the subject — always an individual)
  subjectUserId: text('subject_user_id').notNull().references(() => betterAuthUser.id),

  // WHO they are sharing WITH (the target)
  targetType: shareTargetTypeEnum('target_type').notNull(),
  targetUserId: text('target_user_id').references(() => betterAuthUser.id),     // When target_type = 'user' or 'coach'
  targetTeamId: text('target_team_id').references(() => teams.id),               // When target_type = 'team'
  targetOrgId: text('target_org_id').references(() => betterAuthOrganization.id), // When target_type = 'organisation'
  // For target_type = 'public', all target IDs are null

  // WHAT they are sharing (which report types)
  // Array of report type strings. Empty array or null = no specific restriction (share all owned reports)
  resourceTypes: jsonb('resource_types').$type<string[]>().notNull().default([]),
  // Example: ['base', 'professional_self'] means only these report types are shared
  // An empty array [] means "all current and future report types I own"

  // STATUS
  status: shareGrantStatusEnum('status').notNull().default('active'),

  // LIFECYCLE
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),   // Null = indefinite

  // METADATA
  grantContext: text('grant_context'),     // Optional: 'team_onboarding', 'coach_session', 'peer_share', etc.
  metadata: jsonb('metadata'),             // Additional context

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    subjectIdx: index('share_grants_subject_user_id_idx').on(table.subjectUserId),
    targetUserIdx: index('share_grants_target_user_id_idx').on(table.targetUserId),
    targetTeamIdx: index('share_grants_target_team_id_idx').on(table.targetTeamId),
    targetOrgIdx: index('share_grants_target_org_id_idx').on(table.targetOrgId),
    statusIdx: index('share_grants_status_idx').on(table.status),
  };
});
