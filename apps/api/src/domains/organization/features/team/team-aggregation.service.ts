import { ITeamRepository } from './team.repository';
import { ITeamMembershipRepository } from './team-membership.repository';
import { IShareGrantRepository } from '../../../sharing/share-grant.repository';
import { IScoringRepository } from '../../../scoring/scoring.repository';
import { ScoredProfileOutput, DomainScore } from '../../../scoring/scoring.types';
import { NotFoundError, AccessDeniedError } from '@/shared/errors/domain-error';
import { DOMAINS, SCORE_BANDS } from '@dimensional/shared';

export interface TeamAggregateOutput {
  teamId: string;
  teamName: string;
  memberCount: number;
  sharingMemberCount: number;
  meetsThreshold: boolean;
  aggregate?: {
    domainDistributions: {
      domain: string;
      bandCounts: Record<string, number>;
      meanScore: number;
    }[];
  };
}

export interface ITeamAggregationService {
  getTeamAggregate(teamId: string, requestingUserId: string): Promise<TeamAggregateOutput>;
}

export class TeamAggregationService implements ITeamAggregationService {
  private readonly ANONYMISATION_THRESHOLD = 3;

  constructor(
    private readonly teamRepository: ITeamRepository,
    private readonly teamMembershipRepository: ITeamMembershipRepository,
    private readonly shareGrantRepository: IShareGrantRepository,
    private readonly scoringRepository: IScoringRepository,
  ) {}

  async getTeamAggregate(teamId: string, requestingUserId: string): Promise<TeamAggregateOutput> {
    const team = await this.teamRepository.findById(teamId);
    if (!team) throw new NotFoundError('Team', teamId);

    // Verify requester is a member or leader of the team
    const membership = await this.teamMembershipRepository.findByUserAndTeam(requestingUserId, teamId);
    if (!membership) throw new AccessDeniedError(requestingUserId, teamId, 'You must be a member of this team to view aggregates');

    const members = await this.teamMembershipRepository.findMembers(teamId);
    const memberIds = members.map(m => m.userId);

    // Find all active share grants to this team
    const grants = await this.shareGrantRepository.findActiveGrantsByTeam(teamId);
    const sharingUserIds = grants.map(g => g.subjectUserId);

    const meetsThreshold = sharingUserIds.length >= this.ANONYMISATION_THRESHOLD;

    const output: TeamAggregateOutput = {
      teamId,
      teamName: team.name,
      memberCount: memberIds.length,
      sharingMemberCount: sharingUserIds.length,
      meetsThreshold,
    };

    if (meetsThreshold) {
      const profiles = await Promise.all(
        sharingUserIds.map(userId => 
          this.scoringRepository.findByUserId(userId).then(ps => ps[ps.length - 1]) // Latest profile
        )
      );

      const validProfiles = profiles.filter((p): p is ScoredProfileOutput => !!p);
      
      const domainDistributions = DOMAINS.map(domain => {
        const bandCounts: Record<string, number> = {};
        SCORE_BANDS.forEach(b => { bandCounts[b] = 0; });
        let totalScore = 0;
        
        for (const profile of validProfiles) {
          const domainScore = profile.profilePayload.domains.find(d => d.domain === domain);
          if (domainScore) {
            bandCounts[domainScore.band] = (bandCounts[domainScore.band] || 0) + 1;
            totalScore += domainScore.rawScore;
          }
        }

        return {
          domain,
          bandCounts,
          meanScore: totalScore / validProfiles.length,
        };
      });

      output.aggregate = { domainDistributions };
    }

    return output;
  }
}
