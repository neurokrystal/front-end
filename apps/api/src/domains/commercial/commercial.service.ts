import { ICommercialRepository } from './commercial.repository';
import { IBillingService } from '../billing/billing.service';
import { IAuditService, AUDIT_ACTIONS } from '../audit/audit.service';
import { NotFoundError, DomainError } from '@/shared/errors/domain-error';

export interface ICommercialService {
  createReferralCode(resellerUserId: string, code?: string): Promise<any>;
  getMyReferralCodes(resellerUserId: string): Promise<any[]>;
  attributePurchase(purchaseId: string, referralCode: string): Promise<void>;
  getMyAttributions(resellerUserId: string): Promise<any[]>;
  createPartnerOrg(adminUserId: string, name: string, commissionRateBps: number): Promise<any>;
}

export class CommercialService implements ICommercialService {
  constructor(
    private readonly commercialRepository: ICommercialRepository,
    private readonly billingService: IBillingService,
    private readonly auditService: IAuditService,
  ) {}

  async createReferralCode(resellerUserId: string, code?: string) {
    const finalCode = code || `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return this.commercialRepository.createReferralCode({
      resellerUserId,
      code: finalCode,
      isActive: true,
    });
  }

  async getMyReferralCodes(resellerUserId: string) {
    return this.commercialRepository.findCodesByReseller(resellerUserId);
  }

  async attributePurchase(purchaseId: string, referralCode: string) {
    const code = await this.commercialRepository.findCodeByValue(referralCode);
    if (!code) throw new NotFoundError('Referral code', referralCode);

    const purchase = await this.billingService.getPurchaseById(purchaseId);
    if (!purchase) throw new NotFoundError('Purchase', purchaseId);

    await this.commercialRepository.createAttribution({
      resellerUserId: code.resellerUserId,
      partnerOrgId: code.partnerOrgId,
      purchaseId,
      attributionType: 'first_purchase',
    });

    await this.commercialRepository.incrementCodeUsage(code.id);

    await this.auditService.log({
      actorUserId: 'system',
      actionType: AUDIT_ACTIONS.BILLING_PURCHASE_COMPLETED,
      resourceType: 'purchase',
      resourceId: purchaseId,
      metadata: { referralCode },
    });
  }

  async getMyAttributions(resellerUserId: string) {
    return this.commercialRepository.findAttributionsByReseller(resellerUserId);
  }

  async createPartnerOrg(adminUserId: string, name: string, commissionRateBps: number) {
    return this.commercialRepository.createPartnerOrg({
      name,
      adminUserId,
      commissionRateBps,
    });
  }
}
