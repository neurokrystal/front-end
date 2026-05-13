import { eq, and, or, isNull, gt, lt, isNotNull } from 'drizzle-orm';
import type { DrizzleDb } from '@/infrastructure/database/connection';
import { shareGrants } from './share-grant.schema';

export type ShareGrantRow = typeof shareGrants.$inferSelect;
export type NewShareGrant = typeof shareGrants.$inferInsert;

export interface ShareGrantQuery {
  subjectUserId: string;
  targetType: 'user' | 'team' | 'organisation' | 'coach' | 'public';
  targetUserId?: string;
  targetTeamId?: string;
  targetOrgId?: string;
}

export interface IShareGrantRepository {
  findActiveGrant(query: ShareGrantQuery): Promise<ShareGrantRow | null>;
  findActiveGrantsBySubject(subjectUserId: string): Promise<ShareGrantRow[]>;
  findActiveGrantsByTarget(targetUserId: string): Promise<ShareGrantRow[]>;
  findActiveGrantsByTeam(teamId: string): Promise<ShareGrantRow[]>;
  create(data: NewShareGrant): Promise<ShareGrantRow>;
  revoke(grantId: string): Promise<void>;
  revokeAllForSubjectAndTarget(subjectUserId: string, targetType: string, targetId: string): Promise<number>;
  cleanupExpired(): Promise<number>;
  findById(id: string): Promise<ShareGrantRow | null>;
  update(id: string, data: Partial<NewShareGrant>): Promise<ShareGrantRow>;
}

export class ShareGrantRepository implements IShareGrantRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findActiveGrant(query: ShareGrantQuery): Promise<ShareGrantRow | null> {
    const now = new Date();
    
    const conditions = [
      eq(shareGrants.subjectUserId, query.subjectUserId),
      eq(shareGrants.targetType, query.targetType),
      eq(shareGrants.status, 'active'),
      or(
        isNull(shareGrants.expiresAt),
        gt(shareGrants.expiresAt, now)
      )
    ];

    if (query.targetUserId) {
      conditions.push(eq(shareGrants.targetUserId, query.targetUserId));
    }
    if (query.targetTeamId) {
      conditions.push(eq(shareGrants.targetTeamId, query.targetTeamId));
    }
    if (query.targetOrgId) {
      conditions.push(eq(shareGrants.targetOrgId, query.targetOrgId));
    }

    const result = await this.db
      .select()
      .from(shareGrants)
      .where(and(...conditions))
      .limit(1);

    return result[0] ?? null;
  }

  async findActiveGrantsBySubject(subjectUserId: string): Promise<ShareGrantRow[]> {
    const now = new Date();
    return this.db
      .select()
      .from(shareGrants)
      .where(
        and(
          eq(shareGrants.subjectUserId, subjectUserId),
          eq(shareGrants.status, 'active'),
          or(
            isNull(shareGrants.expiresAt),
            gt(shareGrants.expiresAt, now)
          )
        )
      );
  }

  async findActiveGrantsByTarget(targetUserId: string): Promise<ShareGrantRow[]> {
    const now = new Date();
    // This is simplified; true "shared with me" might involve team memberships too
    // but the repository just looks for direct grants here.
    return this.db
      .select()
      .from(shareGrants)
      .where(
        and(
          eq(shareGrants.targetUserId, targetUserId),
          eq(shareGrants.status, 'active'),
          or(
            isNull(shareGrants.expiresAt),
            gt(shareGrants.expiresAt, now)
          )
        )
      );
  }

  async findActiveGrantsByTeam(teamId: string): Promise<ShareGrantRow[]> {
    const now = new Date();
    return this.db
      .select()
      .from(shareGrants)
      .where(
        and(
          eq(shareGrants.targetTeamId, teamId),
          eq(shareGrants.status, 'active'),
          or(
            isNull(shareGrants.expiresAt),
            gt(shareGrants.expiresAt, now)
          )
        )
      );
  }

  async create(data: NewShareGrant): Promise<ShareGrantRow> {
    const result = await this.db.insert(shareGrants).values(data).returning();
    return result[0];
  }

  async revoke(grantId: string): Promise<void> {
    await this.db
      .update(shareGrants)
      .set({ 
        status: 'revoked',
        revokedAt: new Date()
      })
      .where(eq(shareGrants.id, grantId));
  }

  async revokeAllForSubjectAndTarget(subjectUserId: string, targetType: string, targetId: string): Promise<number> {
    const conditions = [
      eq(shareGrants.subjectUserId, subjectUserId),
      eq(shareGrants.targetType, targetType as any),
      eq(shareGrants.status, 'active')
    ];

    if (targetType === 'user' || targetType === 'coach') {
      conditions.push(eq(shareGrants.targetUserId, targetId));
    } else if (targetType === 'team') {
      conditions.push(eq(shareGrants.targetTeamId, targetId));
    } else if (targetType === 'organisation') {
      conditions.push(eq(shareGrants.targetOrgId, targetId));
    }

    const result = await this.db
      .update(shareGrants)
      .set({ 
        status: 'revoked',
        revokedAt: new Date()
      })
      .where(and(...conditions))
      .returning();
    
    return result.length;
  }

  async cleanupExpired(): Promise<number> {
    const now = new Date();
    const result = await this.db
      .update(shareGrants)
      .set({ 
        status: 'expired'
      })
      .where(
        and(
          eq(shareGrants.status, 'active'),
          isNotNull(shareGrants.expiresAt),
          lt(shareGrants.expiresAt, now)
        )
      )
      .returning();
    
    return result.length;
  }

  async findById(id: string): Promise<ShareGrantRow | null> {
    const result = await this.db
      .select()
      .from(shareGrants)
      .where(eq(shareGrants.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async update(id: string, data: Partial<NewShareGrant>): Promise<ShareGrantRow> {
    const result = await this.db
      .update(shareGrants)
      .set(data)
      .where(eq(shareGrants.id, id))
      .returning();
    return result[0];
  }
}
