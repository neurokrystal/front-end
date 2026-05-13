import { eq } from 'drizzle-orm';
import type { DrizzleDb } from '@/infrastructure/database/connection';
import { purchases, seatAllocations } from './billing.schema';

export interface IBillingRepository {
  createPurchase(data: typeof purchases.$inferInsert): Promise<typeof purchases.$inferSelect>;
  updatePurchase(id: string, data: Partial<typeof purchases.$inferInsert>): Promise<typeof purchases.$inferSelect>;
  createSeatAllocation(data: typeof seatAllocations.$inferInsert): Promise<typeof seatAllocations.$inferSelect>;
  getPurchaseById(id: string): Promise<typeof purchases.$inferSelect | null>;
  getPurchasesByUserId(userId: string): Promise<typeof purchases.$inferSelect[]>;
  getSeatAllocationsByUserId(userId: string): Promise<typeof seatAllocations.$inferSelect[]>;
  getSeatAllocationsByOrgId(orgId: string): Promise<typeof seatAllocations.$inferSelect[]>;
  updateSeatAllocation(id: string, data: Partial<typeof seatAllocations.$inferInsert>): Promise<typeof seatAllocations.$inferSelect>;
}

export class BillingRepository implements IBillingRepository {
  constructor(private readonly db: DrizzleDb) {}

  async createPurchase(data: typeof purchases.$inferInsert) {
    const result = await this.db.insert(purchases).values(data).returning();
    return result[0];
  }

  async updatePurchase(id: string, data: Partial<typeof purchases.$inferInsert>) {
    const result = await this.db.update(purchases)
      .set(data)
      .where(eq(purchases.id, id))
      .returning();
    return result[0];
  }

  async createSeatAllocation(data: typeof seatAllocations.$inferInsert) {
    const result = await this.db.insert(seatAllocations).values(data).returning();
    return result[0];
  }

  async getPurchaseById(id: string) {
    const result = await this.db.select().from(purchases).where(eq(purchases.id, id)).limit(1);
    return result[0] ?? null;
  }

  async getPurchasesByUserId(userId: string) {
    return this.db.select().from(purchases).where(eq(purchases.buyerUserId, userId));
  }

  async getSeatAllocationsByUserId(userId: string) {
    return this.db.select().from(seatAllocations).where(eq(seatAllocations.userId, userId));
  }
  
  async getSeatAllocationsByOrgId(orgId: string) {
    return this.db.select().from(seatAllocations).where(eq(seatAllocations.organizationId, orgId));
  }

  async updateSeatAllocation(id: string, data: Partial<typeof seatAllocations.$inferInsert>) {
    const result = await this.db.update(seatAllocations)
      .set(data)
      .where(eq(seatAllocations.id, id))
      .returning();
    return result[0];
  }
}
