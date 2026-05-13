import { IShareGrantRepository, ShareGrantRow } from './share-grant.repository';
import { ITeamMembershipRepository } from '../organization/features/team/team-membership.repository';
import { ICoachClientLinkRepository } from '../coaching/coach-client-link.repository';
import { ICertificationRepository } from '../coaching/certification.repository';
import { ShareGrantOutput, AccessibleResource } from './sharing.dto';

export interface AccessQuery {
  subjectUserId: string;        // Whose data is being accessed
  viewerUserId: string;         // Who wants to see it
  resourceType: string;         // Which report type (e.g., 'base', 'leader_adapted')
  context?: {
    teamId?: string;            // If the access is in a team context
    orgId?: string;             // If the access is in an org context
  };
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;               // Human-readable explanation
  grantId?: string;             // Which ShareGrant authorised this (for audit trail)
  grantType?: string;           // 'direct_user' | 'team' | 'organisation' | 'coach' | 'self'
}


export interface IAccessEvaluator {
  /**
   * Evaluate whether a viewer can access a specific resource for a subject.
   * This is the SINGLE entry point for all access decisions in the system.
   * Every report view, every profile access, every data share goes through here.
   */
  evaluate(query: AccessQuery): Promise<AccessDecision>;

  /**
   * Get all active share grants where this user is the subject (for "My Sharing" UI).
   */
  getGrantsBySubject(subjectUserId: string): Promise<ShareGrantOutput[]>;

  /**
   * Get all resources accessible to this viewer (for "Shared With Me" UI).
   * Returns a list of subjects + resource types the viewer can access.
   */
  getAccessibleResources(viewerUserId: string): Promise<AccessibleResource[]>;
}

export class AccessEvaluator implements IAccessEvaluator {
  constructor(
    private readonly shareGrantRepository: IShareGrantRepository,
    private readonly teamMembershipRepository: ITeamMembershipRepository,
    private readonly coachClientLinkRepository: ICoachClientLinkRepository,
    private readonly certificationRepository: ICertificationRepository,
  ) {}

  async evaluate(query: AccessQuery): Promise<AccessDecision> {
    // Rule 1: Self-access is always allowed
    if (query.subjectUserId === query.viewerUserId) {
      return { allowed: true, reason: 'Self-access', grantType: 'self' };
    }

    // Rule 2: Check for a direct user share grant
    const directGrant = await this.shareGrantRepository.findActiveGrant({
      subjectUserId: query.subjectUserId,
      targetType: 'user',
      targetUserId: query.viewerUserId,
    });
    if (directGrant && this.resourceTypeMatches(directGrant.resourceTypes, query.resourceType)) {
      return {
        allowed: true,
        reason: 'Direct share grant',
        grantId: directGrant.id,
        grantType: 'direct_user',
      };
    }

    // Rule 3: Check team-level grants
    // Find teams where viewer is a leader and subject is a member
    if (query.context?.teamId) {
      const teamGrant = await this.shareGrantRepository.findActiveGrant({
        subjectUserId: query.subjectUserId,
        targetType: 'team',
        targetTeamId: query.context.teamId,
      });
      if (teamGrant && this.resourceTypeMatches(teamGrant.resourceTypes, query.resourceType)) {
        return {
          allowed: true,
          reason: 'Team share grant',
          grantId: teamGrant.id,
          grantType: 'team',
        };
      }
    } else {
      // No specific team context — check all teams where viewer is a leader
      const viewerTeamLeaderships = await this.teamMembershipRepository.findTeamsWhereLeader(query.viewerUserId);
      for (const team of viewerTeamLeaderships) {
        const teamGrant = await this.shareGrantRepository.findActiveGrant({
          subjectUserId: query.subjectUserId,
          targetType: 'team',
          targetTeamId: team.teamId,
        });
        if (teamGrant && this.resourceTypeMatches(teamGrant.resourceTypes, query.resourceType)) {
          return {
            allowed: true,
            reason: `Team share grant (team: ${team.teamId})`,
            grantId: teamGrant.id,
            grantType: 'team',
          };
        }
      }
    }

    // Rule 4: Check organisation-level grants (aggregate access only)
    if (query.context?.orgId) {
      const orgGrant = await this.shareGrantRepository.findActiveGrant({
        subjectUserId: query.subjectUserId,
        targetType: 'organisation',
        targetOrgId: query.context.orgId,
      });
      if (orgGrant && this.resourceTypeMatches(orgGrant.resourceTypes, query.resourceType)) {
        return {
          allowed: true,
          reason: 'Organisation share grant',
          grantId: orgGrant.id,
          grantType: 'organisation',
        };
      }
    }

    // Rule 5: Check coach grants (requires active coach-client link + active certification)
    const coachGrant = await this.shareGrantRepository.findActiveGrant({
      subjectUserId: query.subjectUserId,
      targetType: 'coach',
      targetUserId: query.viewerUserId,
    });
    if (coachGrant && this.resourceTypeMatches(coachGrant.resourceTypes, query.resourceType)) {
      // Additional check: coach must have active link AND active certification
      const hasActiveLink = await this.coachClientLinkRepository.hasActiveLink(
        query.viewerUserId,
        query.subjectUserId,
      );
      const hasActiveCert = await this.certificationRepository.hasActiveCertification(
        query.viewerUserId,
      );

      if (!hasActiveLink) {
        return {
          allowed: false,
          reason: 'No active coach-client relationship found',
        };
      }

      if (hasActiveLink && hasActiveCert) {
        return {
          allowed: true,
          reason: 'Coach share grant (link active, certified)',
          grantId: coachGrant.id,
          grantType: 'coach',
        };
      }

      if (hasActiveLink && !hasActiveCert) {
        return {
          allowed: false,
          reason: 'Coach certification lapsed — access suspended',
        };
      }
    }

    // No matching grant found
    return {
      allowed: false,
      reason: 'No active share grant found for this viewer/resource combination',
    };
  }

  private resourceTypeMatches(grantResourceTypes: string[], requestedType: string): boolean {
    // Empty array means "all resource types"
    if (!grantResourceTypes || grantResourceTypes.length === 0) return true;
    return grantResourceTypes.includes(requestedType);
  }

  async getGrantsBySubject(subjectUserId: string): Promise<ShareGrantOutput[]> {
    return this.shareGrantRepository.findActiveGrantsBySubject(subjectUserId);
  }

  async getAccessibleResources(viewerUserId: string): Promise<AccessibleResource[]> {
    // 1. Get direct grants
    const directGrants = await this.shareGrantRepository.findActiveGrantsByTarget(viewerUserId);
    const resources: AccessibleResource[] = directGrants.map(g => ({
      subjectUserId: g.subjectUserId,
      resourceTypes: g.resourceTypes,
      grantType: g.targetType === 'coach' ? 'coach' : 'direct_user',
    }));

    // 2. Get team-level grants for teams where viewer is a leader
    const leaderTeams = await this.teamMembershipRepository.findTeamsWhereLeader(viewerUserId);
    for (const team of leaderTeams) {
      const teamGrants = await this.shareGrantRepository.findActiveGrantsByTeam(team.teamId);
      for (const g of teamGrants) {
        resources.push({
          subjectUserId: g.subjectUserId,
          resourceTypes: g.resourceTypes,
          grantType: 'team',
        });
      }
    }

    return resources;
  }
}
