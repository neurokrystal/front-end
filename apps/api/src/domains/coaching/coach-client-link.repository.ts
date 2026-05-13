import { eq, and, or } from 'drizzle-orm';
import { type DrizzleDb } from '@/infrastructure/database/connection';
import { coachClientLinks } from './coach-client-link.schema';

export interface ICoachClientLinkRepository {
  create(data: typeof coachClientLinks.$inferInsert): Promise<typeof coachClientLinks.$inferSelect>;
  findById(id: string): Promise<typeof coachClientLinks.$inferSelect | null>;
  findByToken(token: string): Promise<typeof coachClientLinks.$inferSelect | null>;
  update(id: string, data: Partial<typeof coachClientLinks.$inferInsert>): Promise<void>;
  findByCoach(coachUserId: string): Promise<typeof coachClientLinks.$inferSelect[]>;
  findByClient(clientUserId: string): Promise<typeof coachClientLinks.$inferSelect | null>;
  hasActiveLink(coachUserId: string, clientUserId: string): Promise<boolean>;
}

export class CoachClientLinkRepository implements ICoachClientLinkRepository {
  constructor(private readonly db: DrizzleDb) {}

  async create(data: typeof coachClientLinks.$inferInsert) {
    const results = await this.db.insert(coachClientLinks).values(data).returning();
    return results[0];
  }

  async findById(id: string) {
    const results = await this.db.select().from(coachClientLinks).where(eq(coachClientLinks.id, id));
    return results[0] || null;
  }

  async findByToken(token: string) {
    const results = await this.db.select().from(coachClientLinks).where(eq(coachClientLinks.inviteToken, token));
    return results[0] || null;
  }

  async update(id: string, data: Partial<typeof coachClientLinks.$inferInsert>) {
    await this.db.update(coachClientLinks).set(data).where(eq(coachClientLinks.id, id));
  }

  async findByCoach(coachUserId: string) {
    return this.db.select().from(coachClientLinks).where(
      and(
        eq(coachClientLinks.coachUserId, coachUserId),
        eq(coachClientLinks.status, 'active')
      )
    );
  }

  async findByClient(clientUserId: string) {
    const results = await this.db.select().from(coachClientLinks).where(
      and(
        eq(coachClientLinks.clientUserId, clientUserId),
        eq(coachClientLinks.status, 'active')
      )
    );
    return results[0] || null;
  }

  async hasActiveLink(coachUserId: string, clientUserId: string): Promise<boolean> {
    const results = await this.db.select().from(coachClientLinks).where(
      and(
        eq(coachClientLinks.coachUserId, coachUserId),
        eq(coachClientLinks.clientUserId, clientUserId),
        eq(coachClientLinks.status, 'active')
      )
    );
    return results.length > 0;
  }
}
