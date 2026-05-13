import { eq } from 'drizzle-orm';
import type { DrizzleDb } from '@/infrastructure/database/connection';
import { userProfiles } from './user.schema';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';

export interface IUserRepository {
  findByUserId(userId: string): Promise<typeof userProfiles.$inferSelect | null>;
  getUserById(userId: string): Promise<typeof betterAuthUser.$inferSelect | null>;
  create(data: typeof userProfiles.$inferInsert): Promise<typeof userProfiles.$inferSelect>;
  update(userId: string, data: Partial<typeof userProfiles.$inferInsert>): Promise<typeof userProfiles.$inferSelect>;
}

export class UserRepository implements IUserRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findByUserId(userId: string) {
    const result = await this.db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
    return result[0] ?? null;
  }

  async getUserById(userId: string) {
    const result = await this.db.select().from(betterAuthUser).where(eq(betterAuthUser.id, userId)).limit(1);
    return result[0] ?? null;
  }

  async create(data: typeof userProfiles.$inferInsert) {
    const result = await this.db.insert(userProfiles).values(data).returning();
    return result[0];
  }

  async update(userId: string, data: Partial<typeof userProfiles.$inferInsert>) {
    const result = await this.db.update(userProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return result[0];
  }
}
