import { eq, and, ne } from 'drizzle-orm';
import type { DrizzleDb } from '@/infrastructure/database/connection';
import { reports } from './report.schema';

export interface IReportRepository {
  findById(id: string): Promise<typeof reports.$inferSelect | null>;
  findBySubjectId(subjectUserId: string): Promise<typeof reports.$inferSelect[]>;
  create(data: typeof reports.$inferInsert): Promise<typeof reports.$inferSelect>;
  invalidateViewerReports(subjectUserId: string, viewerUserId: string): Promise<number>;
  invalidateAllViewerReportsForSubject(subjectUserId: string): Promise<number>;
}

export class ReportRepository implements IReportRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(id: string) {
    const result = await this.db.select().from(reports).where(and(eq(reports.id, id), eq(reports.status, 'active'))).limit(1);
    return result[0] ?? null;
  }

  async findBySubjectId(subjectUserId: string) {
    return this.db.select().from(reports).where(and(eq(reports.subjectUserId, subjectUserId), eq(reports.status, 'active'))).orderBy(reports.createdAt);
  }

  async create(data: typeof reports.$inferInsert) {
    const result = await this.db.insert(reports).values(data).returning();
    return result[0];
  }

  async invalidateViewerReports(subjectUserId: string, viewerUserId: string): Promise<number> {
    const result = await this.db.update(reports)
      .set({ status: 'revoked' })
      .where(and(
        eq(reports.subjectUserId, subjectUserId),
        eq(reports.viewerUserId, viewerUserId),
        eq(reports.status, 'active'),
        ne(reports.audience, 'subject_facing'),  // Only viewer-facing and aggregate reports
      ))
      .returning({ id: reports.id });
    return result.length;
  }

  async invalidateAllViewerReportsForSubject(subjectUserId: string): Promise<number> {
    const result = await this.db.update(reports)
      .set({ status: 'revoked' })
      .where(and(
        eq(reports.subjectUserId, subjectUserId),
        eq(reports.status, 'active'),
        ne(reports.audience, 'subject_facing'),
      ))
      .returning({ id: reports.id });
    return result.length;
  }
}
