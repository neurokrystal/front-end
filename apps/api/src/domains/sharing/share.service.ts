import { IShareGrantRepository } from './share-grant.repository';
import { IAuditService, AUDIT_ACTIONS } from '../audit/audit.service';
import { IReportRepository } from '../report/report.repository';
import { IScoringRepository } from '../scoring/scoring.repository';
import { IAccessEvaluator } from './access-evaluator.service';
import { GrantShareInput, ShareGrantOutput, AccessibleResource } from './sharing.dto';
import { INotificationService } from '../notification/notification.types';
import { IUserService } from '../user/user.service';
import { NotFoundError, ForbiddenError, DomainError } from '@/shared/errors/domain-error';

export interface IShareService {
  grantShare(subjectUserId: string, input: GrantShareInput): Promise<ShareGrantOutput>;
  revokeShare(grantId: string, revokingUserId: string): Promise<void>;
  revokeAllSharesForTarget(subjectUserId: string, targetType: string, targetId: string): Promise<void>;
  getMyShares(userId: string): Promise<ShareGrantOutput[]>;
  getSharedWithMe(userId: string): Promise<AccessibleResource[]>;
  cleanupExpired(): Promise<number>;
  setReportRepository(reportRepository: IReportRepository): void;
}

export class ShareService implements IShareService {
  private reportRepository?: IReportRepository;

  constructor(
    private readonly shareGrantRepository: IShareGrantRepository,
    reportRepository: IReportRepository | null,
    private readonly scoringRepository: IScoringRepository,
    private readonly auditService: IAuditService,
    private readonly accessEvaluator: IAccessEvaluator,
    private readonly notificationService?: INotificationService,
    private readonly userService?: IUserService,
  ) {
    if (reportRepository) {
      this.reportRepository = reportRepository;
    }
  }

  setReportRepository(reportRepository: IReportRepository): void {
    this.reportRepository = reportRepository;
  }

  async grantShare(subjectUserId: string, input: GrantShareInput): Promise<ShareGrantOutput> {
    // 1. Validate the subject owns at least one scored profile
    const profiles = await this.scoringRepository.findByUserId(subjectUserId);
    if (profiles.length === 0) {
      throw new DomainError('Cannot share: You must complete at least one assessment first', 'NO_PROFILES', 400);
    }

    // 2. Check for duplicate active grants
    const existingGrant = await this.shareGrantRepository.findActiveGrant({
      subjectUserId,
      targetType: input.targetType,
      targetUserId: input.targetUserId,
      targetTeamId: input.targetTeamId,
      targetOrgId: input.targetOrgId,
    });

    if (existingGrant) {
      // Update existing grant with new resourceTypes and expiry
      const updated = await this.shareGrantRepository.update(existingGrant.id, {
        resourceTypes: input.resourceTypes || existingGrant.resourceTypes,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      });

      await this.auditService.log({
        actorUserId: subjectUserId,
        actionType: 'share.updated',
        resourceType: 'share_grant',
        resourceId: updated.id,
        metadata: {
          targetType: input.targetType,
          resourceTypes: input.resourceTypes,
        },
      });

      return updated;
    }

    // 3. Create the share grant record
    const grant = await this.shareGrantRepository.create({
      subjectUserId,
      targetType: input.targetType,
      targetUserId: input.targetUserId,
      targetTeamId: input.targetTeamId,
      targetOrgId: input.targetOrgId,
      resourceTypes: input.resourceTypes || ['base'],
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      grantContext: input.grantContext,
      status: 'active',
    });

    // 4. Audit log
    await this.auditService.log({
      actorUserId: subjectUserId,
      actionType: AUDIT_ACTIONS.SHARE_GRANTED,
      resourceType: 'share_grant',
      resourceId: grant.id,
      subjectUserId: subjectUserId,
      metadata: { 
        targetType: input.targetType,
        targetUserId: input.targetUserId,
        targetTeamId: input.targetTeamId,
        targetOrgId: input.targetOrgId,
        resourceTypes: input.resourceTypes || ['base']
      },
    });

    if (this.notificationService && input.targetType === 'user' && input.targetUserId) {
      const subject = await this.userService?.getUserById(subjectUserId);
      await this.notificationService.notify({
        type: 'share_granted',
        subjectUserId,
        targetUserId: input.targetUserId,
        resourceTypes: input.resourceTypes,
        subjectName: subject?.displayName || 'Someone',
      });
    }

    return grant;
  }

  async revokeShare(grantId: string, revokingUserId: string): Promise<void> {
    const grant = await this.shareGrantRepository.findById(grantId);
    if (!grant) {
      throw new NotFoundError('ShareGrant', grantId);
    }

    if (grant.subjectUserId !== revokingUserId) {
      throw new ForbiddenError('Only the subject can revoke their own share grant');
    }

    // 1. Mark as revoked
    await this.shareGrantRepository.revoke(grantId);

    // 2. CASCADE: Invalidate viewer reports
    let invalidatedCount = 0;
    if (this.reportRepository) {
      if (grant.targetType === 'user' || grant.targetType === 'coach') {
        if (grant.targetUserId) {
          invalidatedCount = await this.reportRepository.invalidateViewerReports(
            grant.subjectUserId,
            grant.targetUserId,
          );
        }
      } else if (grant.targetType === 'team' || grant.targetType === 'organisation') {
        // Team/org grants affect potentially many viewers — invalidate ALL viewer-facing reports for this subject
        invalidatedCount = await this.reportRepository.invalidateAllViewerReportsForSubject(
          grant.subjectUserId,
        );
      }
    }

    // 3. Audit
    await this.auditService.log({
      actorUserId: revokingUserId,
      actionType: AUDIT_ACTIONS.SHARE_REVOKED,
      resourceType: 'share_grant',
      resourceId: grantId,
      subjectUserId: grant.subjectUserId,
      metadata: { 
        targetType: grant.targetType,
        invalidatedCount
      },
    });

    if (this.notificationService && grant.targetType === 'user' && grant.targetUserId) {
      const subject = await this.userService?.getUserById(grant.subjectUserId);
      await this.notificationService.notify({
        type: 'share_revoked',
        targetUserId: grant.targetUserId,
        subjectDisplayName: subject?.displayName || 'Someone',
      });
    }
  }

  async revokeAllSharesForTarget(subjectUserId: string, targetType: string, targetId: string): Promise<void> {
    await this.shareGrantRepository.revokeAllForSubjectAndTarget(subjectUserId, targetType, targetId);
    
    if (this.reportRepository && (targetType === 'user' || targetType === 'coach')) {
      await this.reportRepository.invalidateViewerReports(subjectUserId, targetId);
    }
    
    await this.auditService.log({
      actorUserId: subjectUserId,
      actionType: AUDIT_ACTIONS.SHARE_REVOKED,
      resourceType: 'share_grant',
      subjectUserId: subjectUserId,
      metadata: { targetType, targetId, scope: 'all_for_target' },
    });
  }

  async getMyShares(userId: string): Promise<ShareGrantOutput[]> {
    return this.shareGrantRepository.findActiveGrantsBySubject(userId);
  }

  async getSharedWithMe(userId: string): Promise<AccessibleResource[]> {
    return this.accessEvaluator.getAccessibleResources(userId);
  }

  async cleanupExpired(): Promise<number> {
    const expiredCount = await this.shareGrantRepository.cleanupExpired();
    if (expiredCount > 0) {
      await this.auditService.log({
        actorUserId: 'system',
        actionType: AUDIT_ACTIONS.SHARE_EXPIRED,
        resourceType: 'share_grant',
        metadata: { count: expiredCount },
      });
    }
    return expiredCount;
  }
}
