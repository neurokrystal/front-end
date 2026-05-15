import { eq, and, sql, aliasedTable } from 'drizzle-orm';
import type { DrizzleDb } from '@/infrastructure/database/connection';
import { auditLogs } from './audit.schema';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';

export interface IAuditRepository {
  create(data: typeof auditLogs.$inferInsert): Promise<void>;
  findBySubjectId(subjectUserId: string): Promise<any[]>;
  find(filters: {
    actorUserId?: string;
    subjectUserId?: string;
    resourceType?: string;
    resourceId?: string;
    limit?: number;
  }): Promise<any[]>;
}

export class AuditRepository implements IAuditRepository {
  constructor(private readonly db: DrizzleDb) {}

  async create(data: typeof auditLogs.$inferInsert) {
    await this.db.insert(auditLogs).values(data);
  }

  async findBySubjectId(subjectUserId: string) {
    return this.db.select().from(auditLogs).where(eq(auditLogs.subjectUserId, subjectUserId)).orderBy(auditLogs.createdAt);
  }

  async find(filters: {
    actorUserId?: string;
    subjectUserId?: string;
    resourceType?: string;
    resourceId?: string;
    limit?: number;
  }) {
    const actorUser = aliasedTable(betterAuthUser, 'actor_user');
    const subjectUser = aliasedTable(betterAuthUser, 'subject_user');

    const conditions = [] as any[];
    if (filters.actorUserId) conditions.push(eq(auditLogs.actorUserId, filters.actorUserId));
    if (filters.subjectUserId) conditions.push(eq(auditLogs.subjectUserId, filters.subjectUserId));
    if (filters.resourceType) conditions.push(eq(auditLogs.resourceType, filters.resourceType));
    if (filters.resourceId) conditions.push(eq(auditLogs.resourceId, filters.resourceId));

    const results = await this.db
      .select({
        id: auditLogs.id,
        actorUserId: auditLogs.actorUserId,
        action: auditLogs.actionType,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        subjectUserId: auditLogs.subjectUserId,
        createdAt: auditLogs.createdAt,
        actorName: actorUser.name,
        subjectName: subjectUser.name,
      })
      .from(auditLogs)
      .leftJoin(actorUser, eq(auditLogs.actorUserId, actorUser.id))
      .leftJoin(subjectUser, eq(auditLogs.subjectUserId, subjectUser.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined as any)
      .orderBy(sql`created_at DESC`)
      .limit(filters.limit ?? 200);

    return results;
  }
}
