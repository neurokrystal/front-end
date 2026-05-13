import type { ITeamRepository } from './team.repository';
import type { TeamOutput, CreateTeamInput, AddTeamMemberInput } from './team.dto';
import { NotFoundError } from '@/shared/errors/domain-error';

export interface ITeamService {
  createTeam(input: CreateTeamInput): Promise<TeamOutput>;
  getTeam(teamId: string): Promise<TeamOutput>;
  getOrganizationTeams(organizationId: string): Promise<TeamOutput[]>;
  addMember(teamId: string, input: AddTeamMemberInput): Promise<void>;
}

export class TeamService implements ITeamService {
  constructor(private readonly teamRepository: ITeamRepository) {}

  async createTeam(input: CreateTeamInput): Promise<TeamOutput> {
    return this.teamRepository.create(input);
  }

  async getTeam(teamId: string): Promise<TeamOutput> {
    const team = await this.teamRepository.findById(teamId);
    if (!team) {
      throw new NotFoundError('Team', teamId);
    }
    return team;
  }

  async getOrganizationTeams(organizationId: string): Promise<TeamOutput[]> {
    return this.teamRepository.findByOrganizationId(organizationId);
  }

  async addMember(teamId: string, input: AddTeamMemberInput): Promise<void> {
    const team = await this.getTeam(teamId);
    await this.teamRepository.addMember({
      teamId: team.id,
      userId: input.userId,
      role: input.role,
    });
  }
}
