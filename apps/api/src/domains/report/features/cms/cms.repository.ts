import { eq, and } from 'drizzle-orm';
import type { DrizzleDb } from '@/infrastructure/database/connection';
import { reportContentBlocks, reportContentVersions } from './cms.schema';

export interface ICmsRepository {
  findActiveBlocks(reportType: string, locale: string): Promise<typeof reportContentBlocks.$inferSelect[]>;
  findById(id: string): Promise<typeof reportContentBlocks.$inferSelect | null>;
  listAll(reportType?: string): Promise<typeof reportContentBlocks.$inferSelect[]>;
  findLatestVersion(reportType: string): Promise<typeof reportContentVersions.$inferSelect | null>;
  createBlock(data: typeof reportContentBlocks.$inferInsert): Promise<typeof reportContentBlocks.$inferSelect>;
  updateBlock(id: string, data: Partial<typeof reportContentBlocks.$inferInsert>): Promise<typeof reportContentBlocks.$inferSelect>;
  deleteBlock(id: string): Promise<void>;
  createVersion(data: typeof reportContentVersions.$inferInsert): Promise<typeof reportContentVersions.$inferSelect>;
  listVersions(reportType?: string): Promise<typeof reportContentVersions.$inferSelect[]>;
}

export class CmsRepository implements ICmsRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findActiveBlocks(reportType: string, locale: string) {
    return this.db.select()
      .from(reportContentBlocks)
      .where(and(
        eq(reportContentBlocks.reportType, reportType),
        eq(reportContentBlocks.locale, locale),
        eq(reportContentBlocks.isActive, true)
      ))
      .orderBy(reportContentBlocks.displayOrder);
  }

  async findById(id: string) {
    const result = await this.db.select().from(reportContentBlocks).where(eq(reportContentBlocks.id, id)).limit(1);
    return result[0] ?? null;
  }

  async listAll(reportType?: string) {
    const query = this.db.select().from(reportContentBlocks);
    if (reportType) {
      query.where(eq(reportContentBlocks.reportType, reportType));
    }
    return query;
  }

  async findLatestVersion(reportType: string) {
    const result = await this.db.select()
      .from(reportContentVersions)
      .where(eq(reportContentVersions.reportType, reportType))
      .orderBy(reportContentVersions.versionNumber)
      .limit(1);
    return result[0] ?? null;
  }

  async createBlock(data: typeof reportContentBlocks.$inferInsert) {
    const result = await this.db.insert(reportContentBlocks).values(data).returning();
    return result[0];
  }

  async updateBlock(id: string, data: Partial<typeof reportContentBlocks.$inferInsert>) {
    const result = await this.db.update(reportContentBlocks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reportContentBlocks.id, id))
      .returning();
    return result[0];
  }

  async createVersion(data: typeof reportContentVersions.$inferInsert) {
    const result = await this.db.insert(reportContentVersions).values(data).returning();
    return result[0];
  }

  async deleteBlock(id: string) {
    await this.db.update(reportContentBlocks).set({ isActive: false }).where(eq(reportContentBlocks.id, id));
  }

  async listVersions(reportType?: string) {
    const query = this.db.select().from(reportContentVersions);
    if (reportType) {
      query.where(eq(reportContentVersions.reportType, reportType));
    }
    return query.orderBy(reportContentVersions.versionNumber);
  }
}
