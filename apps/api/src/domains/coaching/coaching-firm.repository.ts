import { eq } from 'drizzle-orm';
import { type DrizzleDb } from '@/infrastructure/database/connection';
import { coachingFirms } from './coaching-firm.schema';

export interface ICoachingFirmRepository {
  create(data: typeof coachingFirms.$inferInsert): Promise<typeof coachingFirms.$inferSelect>;
  findById(id: string): Promise<typeof coachingFirms.$inferSelect | null>;
  findAll(): Promise<typeof coachingFirms.$inferSelect[]>;
}

export class CoachingFirmRepository implements ICoachingFirmRepository {
  constructor(private readonly db: DrizzleDb) {}

  async create(data: typeof coachingFirms.$inferInsert) {
    const results = await this.db.insert(coachingFirms).values(data).returning();
    return results[0];
  }

  async findById(id: string) {
    const results = await this.db.select().from(coachingFirms).where(eq(coachingFirms.id, id));
    return results[0] || null;
  }

  async findAll() {
    return this.db.select().from(coachingFirms);
  }
}
