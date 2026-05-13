import { pgTable, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { betterAuthOrganization, betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';

export const teamMemberRoleEnum = pgEnum('team_member_role', ['leader', 'member']);

export const teams = pgTable('teams', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => betterAuthOrganization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    orgIdx: index('teams_organization_id_idx').on(table.organizationId),
  };
});

export const teamMemberships = pgTable('team_memberships', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => betterAuthUser.id, { onDelete: 'cascade' }),
  role: teamMemberRoleEnum('role').notNull().default('member'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    teamIdx: index('team_memberships_team_id_idx').on(table.teamId),
    userIdIdx: index('team_memberships_user_id_idx').on(table.userId),
  };
});
