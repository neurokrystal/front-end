import { eq, and, lte } from 'drizzle-orm';
import { type DrizzleDb } from '@/infrastructure/database/connection';
import { deletionRequests } from './user.schema';

export interface IDataDeletionRepository {
  create(data: typeof deletionRequests.$inferInsert): Promise<typeof deletionRequests.$inferSelect>;
  findById(id: string): Promise<typeof deletionRequests.$inferSelect | null>;
  findByUserId(userId: string): Promise<typeof deletionRequests.$inferSelect | null>;
  update(id: string, data: Partial<typeof deletionRequests.$inferInsert>): Promise<void>;
  findPendingScheduledBefore(date: Date): Promise<typeof deletionRequests.$inferSelect[]>;
  findAllPending(): Promise<typeof deletionRequests.$inferSelect[]>;
}

export class DataDeletionRepository implements IDataDeletionRepository {
  constructor(private readonly db: DrizzleDb) {}

  async create(data: typeof deletionRequests.$inferInsert) {
    const results = await this.db.insert(deletionRequests).values(data).returning();
    return results[0];
  }

  async findById(id: string) {
    const results = await this.db.select().from(deletionRequests).where(eq(deletionRequests.id, id));
    return results[0] || null;
  }

  async findByUserId(userId: string) {
    const results = await this.db.select().from(deletionRequests).where(
      and(
        eq(deletionRequests.userId, userId),
        eq(deletionRequests.status, 'pending')
      )
    );
    return results[0] || null;
  }

  async update(id: string, data: Partial<typeof deletionRequests.$inferInsert>) {
    await this.db.update(deletionRequests).set(data).where(eq(deletionRequests.id, id));
  }

  async findPendingScheduledBefore(date: Date) {
    return this.db.select().from(deletionRequests).where(
      and(
        eq(deletionRequests.status, 'pending'),
        lte(deletionRequests.scheduledFor, date)
      )
    );
  }

  async findAllPending() {
    return this.db.select().from(deletionRequests).where(eq(deletionRequests.status, 'pending'));
  }
}
