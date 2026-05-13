import { eq, and } from 'drizzle-orm';
import type { DrizzleDb } from '@/infrastructure/database/connection';
import { teams, teamMemberships } from './team.schema';

export interface ITeamRepository {
  findById(id: string): Promise<typeof teams.$inferSelect | null>;
  findByOrganizationId(organizationId: string): Promise<typeof teams.$inferSelect[]>;
  create(data: typeof teams.$inferInsert): Promise<typeof teams.$inferSelect>;
  addMember(data: typeof teamMemberships.$inferInsert): Promise<void>;
  findMembers(teamId: string): Promise<typeof teamMemberships.$inferSelect[]>;
}

export class TeamRepository implements ITeamRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(id: string) {
    const result = await this.db.select().from(teams).where(eq(teams.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findByOrganizationId(organizationId: string) {
    return this.db.select().from(teams).where(eq(teams.organizationId, organizationId));
  }

  async create(data: typeof teams.$inferInsert) {
    const result = await this.db.insert(teams).values(data).returning();
    return result[0];
  }

  async addMember(data: typeof teamMemberships.$inferInsert) {
    await this.db.insert(teamMemberships).values(data);
  }

  async findMembers(teamId: string) {
    return this.db.select().from(teamMemberships).where(eq(teamMemberships.teamId, teamId));
  }
}
