import { eq, and } from 'drizzle-orm';
import type { DrizzleDb } from '@/infrastructure/database/connection';
import { reportTemplates } from './template.schema';

export interface ITemplateRepository {
  findById(id: string): Promise<typeof reportTemplates.$inferSelect | null>;
  findDefaultForReportType(reportType: string): Promise<typeof reportTemplates.$inferSelect | null>;
  listAll(reportType?: string): Promise<typeof reportTemplates.$inferSelect[]>;
  create(data: typeof reportTemplates.$inferInsert): Promise<typeof reportTemplates.$inferSelect>;
  update(id: string, data: Partial<typeof reportTemplates.$inferInsert>): Promise<typeof reportTemplates.$inferSelect>;
}

export class TemplateRepository implements ITemplateRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(id: string) {
    const result = await this.db.select().from(reportTemplates).where(eq(reportTemplates.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findDefaultForReportType(reportType: string) {
    const result = await this.db.select()
      .from(reportTemplates)
      .where(and(eq(reportTemplates.reportType, reportType), eq(reportTemplates.isDefault, true), eq(reportTemplates.isActive, true)))
      .limit(1);
    return result[0] ?? null;
  }

  async listAll(reportType?: string) {
    const query = this.db.select().from(reportTemplates);
    if (reportType) {
      query.where(eq(reportTemplates.reportType, reportType));
    }
    return query;
  }

  async create(data: typeof reportTemplates.$inferInsert) {
    const result = await this.db.insert(reportTemplates).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<typeof reportTemplates.$inferInsert>) {
    const result = await this.db.update(reportTemplates).set(data).where(eq(reportTemplates.id, id)).returning();
    return result[0];
  }
}
