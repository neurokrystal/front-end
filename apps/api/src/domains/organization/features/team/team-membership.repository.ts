import { eq, and } from 'drizzle-orm';
import type { DrizzleDb } from '@/infrastructure/database/connection';
import { teamMemberships } from './team.schema';

export interface ITeamMembershipRepository {
  findTeamsWhereLeader(userId: string): Promise<{ teamId: string }[]>;
  findByUserAndTeam(userId: string, teamId: string): Promise<typeof teamMemberships.$inferSelect | null>;
  findMembers(teamId: string): Promise<typeof teamMemberships.$inferSelect[]>;
}

export class TeamMembershipRepository implements ITeamMembershipRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findMembers(teamId: string) {
    return this.db.select().from(teamMemberships).where(eq(teamMemberships.teamId, teamId));
  }

  async findByUserAndTeam(userId: string, teamId: string) {
    const results = await this.db.select().from(teamMemberships).where(
      and(
        eq(teamMemberships.userId, userId),
        eq(teamMemberships.teamId, teamId)
      )
    ).limit(1);
    return results[0] || null;
  }

  async findTeamsWhereLeader(userId: string): Promise<{ teamId: string }[]> {
    const results = await this.db
      .select({ teamId: teamMemberships.teamId })
      .from(teamMemberships)
      .where(
        and(
          eq(teamMemberships.userId, userId),
          eq(teamMemberships.role, 'leader')
        )
      );
    return results;
  }
}
