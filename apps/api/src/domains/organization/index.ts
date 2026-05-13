import { type DrizzleDb } from '@/infrastructure/database/connection';
import { TeamRepository } from './features/team/team.repository';
import { TeamService } from './features/team/team.service';
import type { ITeamService } from './features/team/team.service';

export function createOrganizationServices(db: DrizzleDb): {
  teamService: ITeamService;
} {
  const teamRepository = new TeamRepository(db);
  const teamService = new TeamService(teamRepository);
  return { teamService };
}
