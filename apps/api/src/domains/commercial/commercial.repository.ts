import { eq, and, sql } from 'drizzle-orm';
import { type DrizzleDb } from '@/infrastructure/database/connection';
import { referralCodes, referralAttributions, partnerOrgs } from './commercial.schema';

export interface ICommercialRepository {
  createReferralCode(data: typeof referralCodes.$inferInsert): Promise<typeof referralCodes.$inferSelect>;
  findCodeByValue(code: string): Promise<typeof referralCodes.$inferSelect | null>;
  findCodesByReseller(userId: string): Promise<typeof referralCodes.$inferSelect[]>;
  incrementCodeUsage(id: string): Promise<void>;
  createAttribution(data: typeof referralAttributions.$inferInsert): Promise<void>;
  findAttributionsByReseller(userId: string): Promise<any[]>;
  createPartnerOrg(data: typeof partnerOrgs.$inferInsert): Promise<typeof partnerOrgs.$inferSelect>;
}

export class CommercialRepository implements ICommercialRepository {
  constructor(private readonly db: DrizzleDb) {}

  async createReferralCode(data: typeof referralCodes.$inferInsert) {
    const results = await this.db.insert(referralCodes).values(data).returning();
    return results[0];
  }

  async findCodeByValue(code: string) {
    const results = await this.db.select().from(referralCodes).where(
      and(
        eq(referralCodes.code, code),
        eq(referralCodes.isActive, true)
      )
    );
    return results[0] || null;
  }

  async findCodesByReseller(userId: string) {
    return this.db.select().from(referralCodes).where(eq(referralCodes.resellerUserId, userId));
  }

  async incrementCodeUsage(id: string) {
    await this.db.update(referralCodes).set({
      usageCount: sql`${referralCodes.usageCount} + 1`
    }).where(eq(referralCodes.id, id));
  }

  async createAttribution(data: typeof referralAttributions.$inferInsert) {
    await this.db.insert(referralAttributions).values(data);
  }

  async findAttributionsByReseller(userId: string) {
    return this.db.select().from(referralAttributions).where(eq(referralAttributions.resellerUserId, userId));
  }

  async createPartnerOrg(data: typeof partnerOrgs.$inferInsert) {
    const results = await this.db.insert(partnerOrgs).values(data).returning();
    return results[0];
  }
}
