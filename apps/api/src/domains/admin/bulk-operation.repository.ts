import { eq } from 'drizzle-orm';
import { type DrizzleDb } from '@/infrastructure/database/connection';
import { bulkOperations } from './admin.schema';

export interface IBulkOperationRepository {
  create(data: typeof bulkOperations.$inferInsert): Promise<typeof bulkOperations.$inferSelect>;
  findById(id: string): Promise<typeof bulkOperations.$inferSelect | null>;
  update(id: string, data: Partial<typeof bulkOperations.$inferInsert>): Promise<void>;
  findPending(): Promise<typeof bulkOperations.$inferSelect[]>;
}

export class BulkOperationRepository implements IBulkOperationRepository {
  constructor(private readonly db: DrizzleDb) {}

  async create(data: typeof bulkOperations.$inferInsert) {
    const results = await this.db.insert(bulkOperations).values(data).returning();
    return results[0];
  }

  async findById(id: string) {
    const results = await this.db.select().from(bulkOperations).where(eq(bulkOperations.id, id));
    return results[0] || null;
  }

  async update(id: string, data: Partial<typeof bulkOperations.$inferInsert>) {
    await this.db.update(bulkOperations).set(data).where(eq(bulkOperations.id, id));
  }

  async findPending() {
    return this.db.select().from(bulkOperations).where(eq(bulkOperations.status, 'pending'));
  }
}
