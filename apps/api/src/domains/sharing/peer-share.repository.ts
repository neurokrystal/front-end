import { eq, and, or } from 'drizzle-orm';
import { type DrizzleDb } from '@/infrastructure/database/connection';
import { peerShares } from './peer-share.schema';

export interface IPeerShareRepository {
  create(data: typeof peerShares.$inferInsert): Promise<typeof peerShares.$inferSelect>;
  findById(id: string): Promise<typeof peerShares.$inferSelect | null>;
  findByToken(token: string): Promise<typeof peerShares.$inferSelect | null>;
  update(id: string, data: Partial<typeof peerShares.$inferInsert>): Promise<void>;
  findActiveForUser(userId: string): Promise<typeof peerShares.$inferSelect[]>;
}

export class PeerShareRepository implements IPeerShareRepository {
  constructor(private readonly db: DrizzleDb) {}

  async create(data: typeof peerShares.$inferInsert) {
    const results = await this.db.insert(peerShares).values(data).returning();
    return results[0];
  }

  async findById(id: string) {
    const results = await this.db.select().from(peerShares).where(eq(peerShares.id, id));
    return results[0] || null;
  }

  async findByToken(token: string) {
    const results = await this.db.select().from(peerShares).where(eq(peerShares.inviteToken, token));
    return results[0] || null;
  }

  async update(id: string, data: Partial<typeof peerShares.$inferInsert>) {
    await this.db.update(peerShares).set(data).where(eq(peerShares.id, id));
  }

  async findActiveForUser(userId: string) {
    return this.db.select().from(peerShares).where(
      and(
        eq(peerShares.status, 'active'),
        or(
          eq(peerShares.initiatorUserId, userId),
          eq(peerShares.recipientUserId, userId)
        )
      )
    );
  }
}
