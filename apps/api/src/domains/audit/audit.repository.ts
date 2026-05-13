import { eq, and, sql } from 'drizzle-orm';
import type { DrizzleDb } from '@/infrastructure/database/connection';
import { auditLogs } from './audit.schema';

export interface IAuditRepository {
  create(data: typeof auditLogs.$inferInsert): Promise<void>;
  findBySubjectId(subjectUserId: string): Promise<typeof auditLogs.$inferSelect[]>;
  find(filters: {
    actorUserId?: string;
    subjectUserId?: string;
    resourceType?: string;
    resourceId?: string;
  }): Promise<typeof auditLogs.$inferSelect[]>;
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
  }) {
    const conditions = [];
    if (filters.actorUserId) conditions.push(eq(auditLogs.actorUserId, filters.actorUserId));
    if (filters.subjectUserId) conditions.push(eq(auditLogs.subjectUserId, filters.subjectUserId));
    if (filters.resourceType) conditions.push(eq(auditLogs.resourceType, filters.resourceType));
    if (filters.resourceId) conditions.push(eq(auditLogs.resourceId, filters.resourceId));

    let query = this.db.select().from(auditLogs);
    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    return query.orderBy(sql`created_at DESC`);
  }
}
