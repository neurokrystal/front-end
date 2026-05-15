import { eq, and } from 'drizzle-orm';
import type { DrizzleDb } from '@/infrastructure/database/connection';
import { consentRecords } from './consent.schema';

export interface IConsentRepository {
  findById(id: string): Promise<typeof consentRecords.$inferSelect | null>;
  findActive(subjectUserId: string, viewerUserId: string, purpose: string): Promise<typeof consentRecords.$inferSelect | null>;
  create(data: typeof consentRecords.$inferInsert): Promise<typeof consentRecords.$inferSelect>;
  revoke(id: string): Promise<void>;
  findBySubjectId(subjectUserId: string): Promise<typeof consentRecords.$inferSelect[]>;
}

export class ConsentRepository implements IConsentRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findActive(subjectUserId: string, viewerUserId: string, purpose: any) {
    const result = await this.db.select()
      .from(consentRecords)
      .where(and(
        eq(consentRecords.subjectUserId, subjectUserId),
        eq(consentRecords.viewerUserId, viewerUserId),
        eq(consentRecords.purpose, purpose),
        eq(consentRecords.status, 'active')
      ))
      .limit(1);
    return result[0] ?? null;
  }

  async findById(id: string) {
    const result = await this.db.select().from(consentRecords).where(eq(consentRecords.id, id)).limit(1);
    return result[0] ?? null;
  }

  async create(data: typeof consentRecords.$inferInsert) {
    const result = await this.db.insert(consentRecords).values(data).returning();
    return result[0];
  }

  async revoke(id: string) {
    await this.db.update(consentRecords)
      .set({ status: 'revoked', revokedAt: new Date() })
      .where(eq(consentRecords.id, id));
  }

  async findBySubjectId(subjectUserId: string) {
    return this.db.select().from(consentRecords).where(eq(consentRecords.subjectUserId, subjectUserId));
  }
}
