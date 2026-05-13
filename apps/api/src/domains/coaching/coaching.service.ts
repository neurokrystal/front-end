import { ICoachClientLinkRepository } from './coach-client-link.repository';
import { ICertificationRepository } from './certification.repository';
import { ICoachingFirmRepository } from './coaching-firm.repository';
import { IShareService } from '../sharing/share.service';
import { INotificationService } from '../notification/notification.types';
import { IUserService } from '../user/user.service';
import { IAuditService, AUDIT_ACTIONS } from '../audit/audit.service';
import { NotFoundError, DomainError } from '@/shared/errors/domain-error';
import crypto from 'crypto';

export interface ICoachingService {
  inviteClient(coachUserId: string, input: string | { clientEmail: string; clientName?: string }): Promise<any>;
  acceptClientInvite(token: string, clientUserId: string): Promise<any>;
  endClientRelationship(linkId: string, endingUserId: string): Promise<void>;
  endRelationship(linkId: string, endingUserId: string): Promise<void>;
  getMyClients(coachUserId: string): Promise<any[]>;
  getMyCoach(clientUserId: string): Promise<any | null>;
  getCertification(coachUserId: string): Promise<any | null>;
  updateCertificationStatus(certId: string, newStatus: string, adminUserId: string, reason: string): Promise<void>;
  processLapsedCertifications(): Promise<number>;
  createFirm(input: string | { name: string; slug?: string }, adminUserId?: string): Promise<any>;
  addCoachToFirm(firmId: string, coachUserId: string, role: string): Promise<void>;
  setShareService(shareService: IShareService): void;
}

export class CoachingService implements ICoachingService {
  private shareService?: IShareService;

  constructor(
    private readonly linkRepository: ICoachClientLinkRepository,
    private readonly certificationRepository: ICertificationRepository,
    private readonly firmRepository: ICoachingFirmRepository,
    shareService: IShareService | null,
    private readonly notificationService: INotificationService,
    private readonly userService: IUserService,
    private readonly auditService: IAuditService,
  ) {
    if (shareService) {
      this.shareService = shareService;
    }
  }

  setShareService(shareService: IShareService): void {
    this.shareService = shareService;
  }

  async inviteClient(coachUserId: string, input: string | { clientEmail: string; clientName?: string }) {
    const clientEmail = typeof input === 'string' ? input : input.clientEmail;
    // 1. Verify coach is certified
    const hasCert = await this.certificationRepository.hasActiveCertification(coachUserId);
    if (!hasCert) {
      throw new DomainError('Coach must have active certification to invite clients', 'UNCERTIFIED', 403);
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    
    const link = await this.linkRepository.create({
      coachUserId,
      clientEmail,
      inviteToken,
      status: 'pending',
    });

    const coach = await this.userService.getProfile(coachUserId);

    await this.notificationService.notify({
      type: 'seat_invitation',
      email: clientEmail,
      orgName: 'The Dimensional System (Coaching)',
      inviterName: coach?.displayName || 'A coach',
      signupUrl: `${process.env.BETTER_AUTH_URL}/coaching/accept/${inviteToken}`,
    });

    return link;
  }

  async acceptClientInvite(token: string, clientUserId: string) {
    const link = await this.linkRepository.findByToken(token);
    if (!link || link.status !== 'pending') {
      throw new NotFoundError('Pending coaching invitation', token);
    }

    await this.linkRepository.update(link.id, {
      clientUserId,
      status: 'active',
      acceptedAt: new Date(),
    });

    // Automatically grant "base" and "client_formulation" to the coach
    if (this.shareService) {
      await this.shareService.grantShare(clientUserId, {
        targetType: 'coach',
        targetUserId: link.coachUserId,
        resourceTypes: ['base', 'client_formulation'],
        grantContext: 'coaching_relationship',
      });
    }

    return link;
  }

  async endClientRelationship(linkId: string, endingUserId: string) {
    const link = await this.linkRepository.findById(linkId);
    if (!link) throw new NotFoundError('Coaching link', linkId);

    if (link.coachUserId !== endingUserId && link.clientUserId !== endingUserId) {
      throw new DomainError('Unauthorized to end this relationship', 'FORBIDDEN', 403);
    }

    await this.linkRepository.update(linkId, {
      status: 'ended',
      endedAt: new Date(),
    });

    // Revoke share grants
    if (this.shareService && link.clientUserId) {
      await this.shareService.revokeAllSharesForTarget(link.clientUserId, 'coach', link.coachUserId);
    }
  }

  async endRelationship(linkId: string, endingUserId: string) {
    return this.endClientRelationship(linkId, endingUserId);
  }

  async getMyClients(coachUserId: string) {
    return this.linkRepository.findByCoach(coachUserId);
  }

  async getMyCoach(clientUserId: string) {
    return this.linkRepository.findByClient(clientUserId);
  }

  async getCertification(coachUserId: string) {
    return this.certificationRepository.findByCoach(coachUserId);
  }

  async updateCertificationStatus(certId: string, newStatus: string, adminUserId: string, reason: string) {
    const cert = await this.certificationRepository.findById(certId);
    if (!cert) throw new NotFoundError('Certification', certId);

    await this.certificationRepository.update(certId, {
      status: newStatus as 'active' | 'lapsed' | 'suspended' | 'revoked',
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      actionType: AUDIT_ACTIONS.ADMIN_BULK_OPERATION, // Or more specific action
      resourceType: 'certification',
      resourceId: certId,
      reason,
      metadata: { newStatus },
    });
  }

  async processLapsedCertifications(): Promise<number> {
    // Cron logic to move 'active' -> 'lapsed' if expiry passed
    // For now stubbed
    return 0;
  }

  async createFirm(input: string | { name: string; slug?: string }, adminUserId?: string) {
    const name = typeof input === 'string' ? input : input.name;
    const userId = typeof input === 'string' ? adminUserId! : (adminUserId || 'system');
    return this.firmRepository.create({ name, firmAdminUserId: userId });
  }

  async addCoachToFirm(firmId: string, coachUserId: string, role: string) {
    await this.firmRepository.addMembership({
      firmId,
      userId: coachUserId,
      role: role as any,
    });
  }
}
