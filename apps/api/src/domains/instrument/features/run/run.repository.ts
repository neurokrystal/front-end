import { eq, and, sql } from 'drizzle-orm';
import type { DrizzleDb } from '@/infrastructure/database/connection';
import { instrumentRuns, instrumentResponses } from './run.schema';
import { instrumentItems } from '../../instrument.schema';

export interface IRunRepository {
  findById(id: string): Promise<typeof instrumentRuns.$inferSelect | null>;
  create(data: typeof instrumentRuns.$inferInsert): Promise<typeof instrumentRuns.$inferSelect>;
  updateStatus(id: string, status: typeof instrumentRuns.$inferSelect.status): Promise<void>;
  upsertResponse(data: typeof instrumentResponses.$inferInsert): Promise<void>;
  getRunProgress(runId: string): Promise<{ total: number; answered: number }>;
  getRunWithResponses(runId: string): Promise<RunWithResponses | null>;
  markScored(runId: string, profileId: string, consistencyScore: number): Promise<void>;
}

export type RunWithResponses = typeof instrumentRuns.$inferSelect & {
  responses: (typeof instrumentResponses.$inferSelect & {
    domainTag: string | null;
    dimensionTag: string | null;
    stateTag: string | null;
    configJson: { reverseScored?: boolean; weight?: number } | null;
  })[];
};

export class RunRepository implements IRunRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(id: string) {
    const result = await this.db.select().from(instrumentRuns).where(eq(instrumentRuns.id, id)).limit(1);
    return result[0] ?? null;
  }

  async create(data: typeof instrumentRuns.$inferInsert) {
    const result = await this.db.insert(instrumentRuns).values(data).returning();
    return result[0];
  }

  async updateStatus(id: string, status: typeof instrumentRuns.$inferSelect.status) {
    await this.db.update(instrumentRuns)
      .set({ status, completedAt: status === 'completed' ? new Date() : null })
      .where(eq(instrumentRuns.id, id));
  }

  async upsertResponse(data: typeof instrumentResponses.$inferInsert) {
    await this.db.insert(instrumentResponses)
      .values(data)
      .onConflictDoUpdate({
        target: [instrumentResponses.runId, instrumentResponses.itemId],
        set: { responseValue: data.responseValue, answeredAt: new Date() }
      });
  }

  async getRunProgress(runId: string) {
    const run = await this.findById(runId);
    if (!run) return { total: 0, answered: 0 };

    const totalRes = await this.db.select({ count: sql<number>`count(*)` })
      .from(instrumentItems)
      .where(eq(instrumentItems.instrumentVersionId, run.instrumentVersionId));
    
    const answeredRes = await this.db.select({ count: sql<number>`count(*)` })
      .from(instrumentResponses)
      .where(eq(instrumentResponses.runId, runId));

    return {
      total: Number(totalRes[0]?.count ?? 0),
      answered: Number(answeredRes[0]?.count ?? 0),
    };
  }

  async getRunWithResponses(runId: string): Promise<RunWithResponses | null> {
    const run = await this.findById(runId);
    if (!run) return null;

    const responses = await this.db.select({
      id: instrumentResponses.id,
      runId: instrumentResponses.runId,
      itemId: instrumentResponses.itemId,
      responseValue: instrumentResponses.responseValue,
      responseText: instrumentResponses.responseText,
      answeredAt: instrumentResponses.answeredAt,
      domainTag: instrumentItems.domainTag,
      dimensionTag: instrumentItems.dimensionTag,
      stateTag: instrumentItems.stateTag,
      configJson: instrumentItems.configJson,
    })
    .from(instrumentResponses)
    .innerJoin(instrumentItems, eq(instrumentResponses.itemId, instrumentItems.id))
    .where(eq(instrumentResponses.runId, runId));

    return {
      ...run,
      responses,
    };
  }

  async markScored(runId: string, profileId: string, consistencyScore: number) {
    await this.db.update(instrumentRuns)
      .set({ scoredProfileId: profileId, consistencyScore })
      .where(eq(instrumentRuns.id, runId));
  }
}
