import { pgTable, text, timestamp, jsonb, customType, index } from 'drizzle-orm/pg-core';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';

// inet type for drizzle
const inet = customType<{ data: string }>({
  dataType() {
    return 'inet';
  },
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  actorUserId: text('actor_user_id').references(() => betterAuthUser.id),    // Who performed the action
  actionType: text('action_type').notNull(),            // e.g., 'report.viewed'
  resourceType: text('resource_type'),        // e.g., 'scored_profile'
  resourceId: text('resource_id'),
  subjectUserId: text('subject_user_id').references(() => betterAuthUser.id),  // Whose data was accessed
  reason: text('reason'),
  metadata: jsonb('metadata'),
  ipAddress: inet('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    actorIdx: index('audit_logs_actor_user_id_idx').on(table.actorUserId),
    subjectIdx: index('audit_logs_subject_user_id_idx').on(table.subjectUserId),
    actionIdx: index('audit_logs_action_type_idx').on(table.actionType),
    createdIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  };
});
