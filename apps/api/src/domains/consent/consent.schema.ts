import { pgTable, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';

export const consentStatusEnum = pgEnum('consent_status', ['active', 'revoked']);
export const consentPurposeEnum = pgEnum('consent_purpose', [
  'team_leader_view', 'org_admin_aggregate', 'coach_view',
  'peer_share', 'comparison_report', 'research_anonymised',
]);

export const consentRecords = pgTable('consent_records', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  subjectUserId: text('subject_user_id').notNull().references(() => betterAuthUser.id),   // Who is granting consent
  viewerUserId: text('viewer_user_id').notNull().references(() => betterAuthUser.id),     // Who is receiving access
  purpose: consentPurposeEnum('purpose').notNull(),
  reportType: text('report_type'),                     // Nullable
  status: consentStatusEnum('status').notNull().default('active'),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
