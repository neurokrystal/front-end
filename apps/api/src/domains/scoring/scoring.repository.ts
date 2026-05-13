import { eq, sql } from 'drizzle-orm';
import type { DrizzleDb } from '@/infrastructure/database/connection';
import { scoredProfiles } from './scoring.schema';

export interface IScoringRepository {
  findById(id: string): Promise<typeof scoredProfiles.$inferSelect | null>;
  findByUserId(userId: string): Promise<typeof scoredProfiles.$inferSelect[]>;
  findByRunId(runId: string): Promise<typeof scoredProfiles.$inferSelect | null>;
  create(data: typeof scoredProfiles.$inferInsert): Promise<typeof scoredProfiles.$inferSelect>;
  updateProfile(id: string, data: Partial<typeof scoredProfiles.$inferInsert>): Promise<void>;
}

export class ScoringRepository implements IScoringRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(id: string) {
    const result = await this.db.select().from(scoredProfiles).where(eq(scoredProfiles.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findByUserId(userId: string) {
    return this.db.select().from(scoredProfiles).where(eq(scoredProfiles.userId, userId)).orderBy(scoredProfiles.createdAt);
  }

  async findByRunId(runId: string) {
    const result = await this.db.select().from(scoredProfiles).where(eq(scoredProfiles.instrumentRunId, runId)).limit(1);
    return result[0] ?? null;
  }

  async create(data: typeof scoredProfiles.$inferInsert) {
    const result = await this.db.insert(scoredProfiles).values(data).returning();
    return result[0];
  }

  async updateProfile(id: string, data: Partial<typeof scoredProfiles.$inferInsert>) {
    await this.db.update(scoredProfiles).set(data).where(eq(scoredProfiles.id, id));
  }
}
