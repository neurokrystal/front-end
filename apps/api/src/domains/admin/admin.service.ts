import type { IAdminRepository } from './admin.repository';
import type { IBulkOperationRepository } from './bulk-operation.repository';
import type { IBillingService } from '../billing/billing.service';
import type { IScoringRepository } from '../scoring/scoring.repository';
import type { IAuditService } from '../audit/audit.service';
import type { IReportService } from '../report/report.service';
import { AUDIT_ACTIONS } from '../audit/audit.service';
import { GrantCompInput, ManualCorrectionInput } from './admin.dto';

import { bulkOperations } from './admin.schema';
import { AdminDashboardStats } from './admin.repository';

export interface BulkOperationInput {
  operation: 'regenerate_reports' | 'rescore_profiles' | 'send_notification' | 'tag_users';
  targetIds: string[];
  params?: Record<string, unknown>;
  reason: string;
}

export interface IAdminService {
  getDashboardStats(adminUserId?: string): Promise<AdminDashboardStats>;
  getAssessmentsTimeline(adminUserId?: string): Promise<Array<{ date: string; count: number }>>;
  getDomainDistribution(adminUserId?: string): Promise<any>;
  listUsers(limit: number, offset: number): Promise<any[]>;
  exportUsers(adminUserId: string, filters?: Record<string, unknown>): Promise<any[]>;
  grantComp(input: GrantCompInput): Promise<void>;
  correctProfile(profileId: string, adminUserId: string, reason: string): Promise<void>;
  impersonateUser(adminUserId: string, targetUserId: string, reason: string): Promise<void>;
  bulkOperation(adminUserId: string, operation: string, targetIds: string[], reason: string): Promise<void>;
  startBulkOperation(input: BulkOperationInput, adminUserId: string): Promise<string>;
  getBulkOperation(id: string): Promise<typeof bulkOperations.$inferSelect | null>;
  grantCompAccount(adminUserId: string, targetUserId: string, reason: string): Promise<void>;
  grantCompAssessment(arg1: string, arg2: string, arg3?: string): Promise<any>;
  rescoreProfile(profileId: string, newStrategyKey: string, adminUserId: string, reason: string): Promise<void>;
  overrideBand(profileId: string, field: string, newBand: string, adminUserId: string, reason: string): Promise<void>;
  regenerateReport(reportId: string, adminUserId?: string, reason?: string): Promise<any>;
  setReportService(reportService: IReportService): void;
}

export class AdminService implements IAdminService {
  private reportService?: IReportService;

  constructor(
    private readonly adminRepository: IAdminRepository,
    private readonly bulkOperationRepository: IBulkOperationRepository,
    private readonly billingService: IBillingService,
    private readonly scoringRepository: IScoringRepository,
    private readonly auditService: IAuditService,
  ) {}

  setReportService(reportService: IReportService) {
    this.reportService = reportService;
  }

  async getDashboardStats(adminUserId?: string) {
    // In a real app, we'd check if adminUserId has permissions
    return this.adminRepository.getDashboardStats();
  }

  async getAssessmentsTimeline(adminUserId?: string) {
    return this.adminRepository.getAssessmentsTimeline();
  }

  async getDomainDistribution(adminUserId?: string) {
    return this.adminRepository.getDomainDistribution();
  }

  async listUsers(limit: number, offset: number) {
    return this.adminRepository.listUsers(limit, offset);
  }

  async exportUsers(adminUserId: string, filters?: Record<string, unknown>) {
    await this.auditService.log({
      actorUserId: adminUserId,
      actionType: AUDIT_ACTIONS.ADMIN_USER_EXPORT,
      resourceType: 'user',
      metadata: { filters },
    });
    return this.adminRepository.exportUsersData();
  }

  async grantComp(input: GrantCompInput) {
    // We can use billing service to complete a manual purchase
    // NOTE: This is the old way, but we'll keep it for now if needed by routes
    // and add audit log
    await this.auditService.log({
      actorUserId: 'system', // or get from context if possible
      actionType: AUDIT_ACTIONS.ADMIN_COMP_GRANT,
      resourceType: 'user',
      resourceId: input.userId,
      reason: input.reason,
    });

    await this.billingService.createCompPurchase(input.userId, input.purchaseType, input.reason);
  }

  async correctProfile(profileId: string, adminUserId: string, reason: string) {
    await this.auditService.log({
      actorUserId: adminUserId,
      actionType: AUDIT_ACTIONS.PROFILE_CORRECTED,
      resourceType: 'scored_profile',
      resourceId: profileId,
      reason,
    });
    throw new Error('Not implemented');
  }

  async impersonateUser(adminUserId: string, targetUserId: string, reason: string) {
    await this.auditService.log({
      actorUserId: adminUserId,
      actionType: AUDIT_ACTIONS.ADMIN_IMPERSONATE,
      resourceType: 'user',
      resourceId: targetUserId,
      reason,
    });
    throw new Error('Not implemented');
  }

  async bulkOperation(adminUserId: string, operation: string, targetIds: string[], reason: string) {
    await this.auditService.log({
      actorUserId: adminUserId,
      actionType: AUDIT_ACTIONS.ADMIN_BULK_OPERATION,
      resourceType: 'system',
      metadata: { operation, targetIds },
      reason,
    });
    // This is the older method, we'll use startBulkOperation for the real work
    throw new Error('Not implemented — use startBulkOperation');
  }

  async startBulkOperation(input: BulkOperationInput, adminUserId: string): Promise<string> {
    const op = await this.bulkOperationRepository.create({
      adminUserId,
      operation: input.operation,
      targetCount: input.targetIds.length,
      reason: input.reason,
      status: 'pending',
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      actionType: AUDIT_ACTIONS.ADMIN_BULK_OPERATION,
      resourceType: 'bulk_operation',
      resourceId: op.id,
      reason: input.reason,
      metadata: { operation: input.operation, targetCount: input.targetIds.length },
    });

    // Start background processing
    this.processBulkOperation(op.id, input).catch(console.error);

    return op.id;
  }

  async getBulkOperation(id: string) {
    return this.bulkOperationRepository.findById(id);
  }

  private async processBulkOperation(id: string, input: BulkOperationInput) {
    await this.bulkOperationRepository.update(id, { status: 'running' });
    
    let completed = 0;
    let failed = 0;
    const results: Array<{ targetId: string; error?: string; success?: boolean }> = [];

    for (const targetId of input.targetIds) {
      try {
        // Execute operation based on type
        switch (input.operation) {
          case 'regenerate_reports':
            // await this.regenerateReport(targetId, input.adminUserId, input.reason);
            break;
          case 'rescore_profiles':
            // await this.rescoreProfile(targetId, input.params?.strategyKey, input.adminUserId, input.reason);
            break;
          default:
            throw new Error(`Unknown bulk operation: ${input.operation}`);
        }
        completed++;
      } catch (e) {
        failed++;
        results.push({ targetId, error: String(e) });
      }

      // Update progress every 10 items or at the end
      if (completed % 10 === 0 || completed + failed === input.targetIds.length) {
        await this.bulkOperationRepository.update(id, {
          completedCount: completed,
          failedCount: failed,
        });
      }
    }

    await this.bulkOperationRepository.update(id, {
      status: failed === 0 ? 'completed' : (completed === 0 ? 'failed' : 'completed'), // partial success is 'completed' with failedCount > 0
      completedAt: new Date(),
      resultJson: { results },
    });
  }

  async grantCompAccount(adminUserId: string, targetUserId: string, reason: string) {
    await this.auditService.log({
      actorUserId: adminUserId,
      actionType: AUDIT_ACTIONS.ADMIN_COMP_GRANT,
      resourceType: 'user',
      resourceId: targetUserId,
      reason,
    });
    throw new Error('Not implemented');
  }

  async grantCompAssessment(arg1: string, arg2: string, arg3?: string): Promise<any> {
    const adminUserId = arg3 ? arg1 : 'system';
    const targetUserId = arg3 ? arg2 : arg1;
    const reason = arg3 || arg2;

    await this.auditService.log({
      actorUserId: adminUserId,
      actionType: AUDIT_ACTIONS.ADMIN_COMP_GRANT,
      resourceType: 'user',
      resourceId: targetUserId,
      reason,
    });

    return this.billingService.createCompPurchase(targetUserId, 'individual_assessment', reason);
  }

  async rescoreProfile(profileId: string, newStrategyKey: string, adminUserId: string, reason: string) {
    await this.auditService.log({
      actorUserId: adminUserId,
      actionType: AUDIT_ACTIONS.PROFILE_CORRECTED,
      resourceType: 'scored_profile',
      resourceId: profileId,
      reason,
      metadata: { newStrategyKey },
    });
    throw new Error('Not implemented');
  }

  async overrideBand(profileId: string, field: string, newBand: string, adminUserId: string, reason: string) {
    await this.auditService.log({
      actorUserId: adminUserId,
      actionType: AUDIT_ACTIONS.ADMIN_PROFILE_EDIT,
      resourceType: 'scored_profile',
      resourceId: profileId,
      reason,
      metadata: { field, newBand },
    });
    throw new Error('Not implemented');
  }

  async regenerateReport(reportId: string, adminUserId?: string, reason?: string): Promise<any> {
    if (!this.reportService) {
      throw new Error('ReportService not initialized in AdminService');
    }

    await this.auditService.log({
      actorUserId: adminUserId || 'system',
      actionType: AUDIT_ACTIONS.ADMIN_REPORT_REGENERATE,
      resourceType: 'report',
      resourceId: reportId,
      reason: reason || 'Manual regeneration',
    });

    // To regenerate, we find the old report, and create a new one with same params
    const oldReport = await this.reportService.getReport(reportId, adminUserId || 'system');
    
    return this.reportService.generateReport({
      reportType: oldReport.reportType,
      subjectUserId: oldReport.subjectUserId,
      viewerUserId: oldReport.subjectUserId, // Default to subject
      scoredProfileId: oldReport.primaryScoredProfileId || undefined,
    });
  }
}
