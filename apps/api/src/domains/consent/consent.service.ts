import type { IConsentRepository } from './consent.repository';
import type { IAuditService } from '../audit/audit.service';
import type { IReportRepository } from '../report/report.repository';
import { CONSENT_PURPOSES, type ConsentPurpose } from '@dimensional/shared';
import { AUDIT_ACTIONS } from '../audit/audit.service';

export interface IConsentService {
  grantConsent(subjectUserId: string, viewerUserId: string, purpose: ConsentPurpose): Promise<any>;
  revokeConsent(consentId: string, actorUserId: string): Promise<void>;
  hasActiveConsent(subjectUserId: string, viewerUserId: string, purpose: ConsentPurpose): Promise<boolean>;
}

export class ConsentService implements IConsentService {
  constructor(
    private readonly consentRepository: IConsentRepository,
    private readonly auditService: IAuditService,
    private readonly reportRepository: IReportRepository,
  ) {}

  async grantConsent(subjectUserId: string, viewerUserId: string, purpose: ConsentPurpose) {
    const consent = await this.consentRepository.create({
      subjectUserId,
      viewerUserId,
      purpose,
      status: 'active',
    });

    await this.auditService.log({
      actorUserId: subjectUserId,
      actionType: AUDIT_ACTIONS.CONSENT_GRANTED,
      resourceType: 'consent_record',
      resourceId: consent.id,
      subjectUserId: subjectUserId,
      metadata: { viewerUserId, purpose },
    });

    return consent;
  }

  async revokeConsent(consentId: string, actorUserId: string) {
    const consent = await this.consentRepository.findById(consentId);
    if (!consent) return;

    await this.consentRepository.revoke(consentId);
    
    // Cascade to reports
    if (consent.viewerUserId) {
      await this.reportRepository.revokeViewerAccess(consent.subjectUserId, consent.viewerUserId);
    }

    await this.auditService.log({
      actorUserId,
      actionType: AUDIT_ACTIONS.CONSENT_REVOKED,
      resourceType: 'consent_record',
      resourceId: consentId,
    });
  }

  async hasActiveConsent(subjectUserId: string, viewerUserId: string, purpose: ConsentPurpose): Promise<boolean> {
    if (subjectUserId === viewerUserId) return true;
    const consent = await this.consentRepository.findActive(subjectUserId, viewerUserId, purpose);
    return !!consent;
  }
}
