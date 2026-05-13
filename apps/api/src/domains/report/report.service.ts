import type { IReportRepository } from './report.repository';
import type { ITemplateRepository } from './features/template/template.repository';
import type { IScoringService } from '../scoring/scoring.service';
import type { ICmsService } from './features/cms/cms.service';
import type { IHtmlTemplateRenderer } from './features/renderer/html-template.renderer';
import type { IPdfGenerator } from './features/pdf/pdf.interface';
import type { IStorageService } from '@/infrastructure/storage/storage.interface';
import type { IUserService } from '../user/user.service';
import type { IAuditService } from '../audit/audit.service';
import type { IAccessEvaluator } from '../sharing/access-evaluator.service';
import type { IBillingService } from '../billing/billing.service';
import type { IShareGrantRepository } from '../sharing/share-grant.repository';
import { AUDIT_ACTIONS } from '../audit/audit.service';
import { INotificationService } from '../notification/notification.types';
import { reportRendererRegistry } from './features/renderer/renderer.registry';
import { NotFoundError, DomainError, InsufficientDataError, AccessDeniedError } from '@/shared/errors/domain-error';
import { REPORT_TYPE_AUDIENCE, type ReportType, PLATFORM_CONSTANTS, type ReportTemplate } from '@dimensional/shared';

// Import all renderers so they self-register
import './features/renderer/base-report.renderer';
import './features/renderer/secondary-reports.renderer';
import './features/renderer/team-architecture.renderer';
import './features/renderer/leader-adapted.renderer';
import './features/renderer/comparison-reports.renderer';
import './features/renderer/coach-reports.renderer';

import { ScoredProfilePayload, ScoredProfileOutput } from '../scoring/scoring.types';
import { reports } from './report.schema';

export interface ReportOutput extends Omit<typeof reports.$inferSelect, 'renderedPayload'> {
  renderedPayload: {
    html: string;
    pdfUrl: string;
  } | null;
  data?: any;
  meetsThreshold?: boolean;
  completedAt?: Date | null;
}

export interface IReportService {
  generateReport(params: {
    reportType: string;
    subjectUserId: string;
    viewerUserId?: string | null;
    scoredProfileId?: string;
    secondaryScoredProfileId?: string;
    teamId?: string;
  }): Promise<ReportOutput>;
  getReport(reportId: string, viewerUserId: string): Promise<ReportOutput>;
  getReportsForUser(userId: string, requestingUserId?: string): Promise<ReportOutput[]>;
  getUserReports(userId: string, requestingUserId?: string): Promise<ReportOutput[]>;
  getTeamAggregate(teamId: string, requestingUserId: string): Promise<ReportOutput>;
  getReportPdf(reportId: string, viewerUserId: string): Promise<Buffer>;
}

export class ReportService implements IReportService {
  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly templateRepository: ITemplateRepository,
    private readonly scoringService: IScoringService,
    private readonly cmsService: ICmsService,
    private readonly htmlRenderer: IHtmlTemplateRenderer,
    private readonly pdfGenerator: IPdfGenerator,
    private readonly storageService: IStorageService,
    private readonly userService: IUserService,
    private readonly accessEvaluator: IAccessEvaluator,
    private readonly auditService: IAuditService,
    private readonly billingService: IBillingService,
    private readonly shareGrantRepository: IShareGrantRepository,
    private readonly notificationService?: INotificationService,
  ) {}

  async generateReport(params: {
    reportType: string;
    subjectUserId: string;
    viewerUserId?: string | null;
    scoredProfileId?: string;
    secondaryScoredProfileId?: string;
    teamId?: string;
  }): Promise<ReportOutput> {
    const viewerUserId = params.viewerUserId !== undefined ? params.viewerUserId : null;
    // 1. Load the scored profile(s)
    let profile: ScoredProfileOutput | undefined;
    if (params.scoredProfileId) {
      profile = await this.scoringService.getProfileById(params.scoredProfileId);
    }

    // 2. Enforce entitlement for secondary reports
    if (params.reportType !== 'base' && params.reportType !== 'team_architecture') {
      const hasEntitlement = await this.billingService.hasUnusedSecondaryPurchase(params.subjectUserId, params.reportType);
      if (!hasEntitlement) {
        throw new DomainError(`Missing entitlement for report type: ${params.reportType}`, 'MISSING_ENTITLEMENT', 403);
      }
    }

    let teamProfiles: ScoredProfilePayload[] | undefined;
    if (params.reportType === 'team_architecture' && params.teamId) {
      const grants = await this.shareGrantRepository.findActiveGrantsByTeam(params.teamId);
      const sharingUserIds = grants.map((g: any) => g.subjectUserId);
      
      if (sharingUserIds.length < 3) {
        throw new DomainError('Team report requires at least 3 sharing members', 'INSUFFICIENT_DATA', 400);
      }

      const profiles = await Promise.all(
        sharingUserIds.map((userId: string) => 
          this.scoringService.getProfilesForUser(userId).then(ps => ps[ps.length - 1]) // Latest profile
        )
      );
      teamProfiles = profiles.filter((p: any): p is ScoredProfileOutput => !!p).map(p => p.profilePayload);
    }

    let longitudinalProfiles: ScoredProfilePayload[] | undefined;
    if (params.reportType === 'progress') {
      const allProfiles = await this.scoringService.getProfilesForUser(params.subjectUserId);
      if (allProfiles.length < 2) {
        throw new DomainError('Progress report requires at least 2 completed assessments', 'INSUFFICIENT_DATA', 400);
      }
      longitudinalProfiles = allProfiles.map(p => p.profilePayload);
    }

    const secondaryProfile = params.secondaryScoredProfileId
      ? await this.scoringService.getProfileById(params.secondaryScoredProfileId)
      : undefined;

    // 2. Load the active template for this report type
    const template = await this.templateRepository.findDefaultForReportType(params.reportType);
    if (!template) throw new NotFoundError('ReportTemplate', params.reportType);

    // 3. Load CMS content blocks for this report type
    const cmsBlocks = await this.cmsService.getActiveBlocks(params.reportType as ReportType);

    // 4. Render HTML using the template
    const html = this.htmlRenderer.render({
      template: template.templateJson as ReportTemplate,
      profile: profile?.profilePayload,
      secondaryProfile: secondaryProfile?.profilePayload,
      teamProfiles,
      longitudinalProfiles,
      cmsBlocks,
      subjectName: await this.userService.getUserDisplayName(params.subjectUserId),
      reportDate: new Date().toISOString(),
    });

    // 5. Generate PDF
    const pdfBuffer = await this.pdfGenerator.generateFromHtml(html, {
      pageWidth: (template.templateJson as ReportTemplate).pageSize.width,
      pageHeight: (template.templateJson as ReportTemplate).pageSize.height,
      margins: (template.templateJson as ReportTemplate).margins,
      printBackground: true,
      displayHeaderFooter: false,  // Handled by the template itself
    });

    // 6. Upload PDF to storage
    // We create a temporary ID for the path or use a deterministic one
    const reportId = crypto.randomUUID();
    const pdfUrl = await this.storageService.uploadFile(
      `reports/${params.subjectUserId}/${reportId}.pdf`,
      pdfBuffer,
      'application/pdf'
    );

    // 7. Persist the report record
    const report = await this.reportRepository.create({
      id: reportId,
      reportType: params.reportType,
      audience: REPORT_TYPE_AUDIENCE[params.reportType as ReportType],
      subjectUserId: params.subjectUserId,
      viewerUserId: viewerUserId,
      primaryScoredProfileId: params.scoredProfileId ?? '',
      secondaryScoredProfileId: params.secondaryScoredProfileId,
      renderedPayload: { html, pdfUrl },
      contentVersionId: template.id,
    });

    // 8. Audit log
    await this.auditService.log({
      actorUserId: viewerUserId ?? params.subjectUserId,
      actionType: AUDIT_ACTIONS.REPORT_GENERATED,
      resourceType: 'report',
      resourceId: report.id,
      subjectUserId: params.subjectUserId,
    });

    if (this.notificationService) {
      await this.notificationService.notify({
        type: 'report_ready',
        userId: params.subjectUserId,
        reportId: (report as any).id,
        reportType: params.reportType,
      });
    }

    return report as any;
  }

  async getReport(reportId: string, requestingUserId: string): Promise<ReportOutput> {
    const report = await this.reportRepository.findById(reportId) as ReportOutput | null;
    if (!report) {
      throw new NotFoundError('Report', reportId);
    }

    // Subject viewing their own report — no consent needed
    if (report.subjectUserId === requestingUserId) {
      await this.auditService.log({
        actorUserId: requestingUserId,
        actionType: AUDIT_ACTIONS.REPORT_VIEWED,
        resourceType: 'report',
        resourceId: reportId,
        subjectUserId: report.subjectUserId,
      });
      return report;
    }

    // If report has been revoked for viewers, block non-subject access
    if (report.status === 'revoked') {
      throw new DomainError('Access to this report has been revoked', 'REPORT_REVOKED', 403);
    }

    // Viewer accessing someone else's report — re-check access NOW
    const decision = await this.accessEvaluator.evaluate({
      subjectUserId: report.subjectUserId,
      viewerUserId: requestingUserId,
      resourceType: report.reportType,
    });

    if (!decision.allowed) {
      // Log the denied access attempt
      await this.auditService.log({
        actorUserId: requestingUserId,
        actionType: AUDIT_ACTIONS.ACCESS_DENIED,
        resourceType: 'report',
        resourceId: reportId,
        subjectUserId: report.subjectUserId,
        metadata: { reason: decision.reason },
      });
      // Use 404 instead of 403 to prevent resource enumeration
      throw new NotFoundError('Report', reportId);
    }

    // Log the granted access with the grant ID for audit trail
    await this.auditService.log({
      actorUserId: requestingUserId,
      actionType: AUDIT_ACTIONS.REPORT_VIEWED,
      resourceType: 'report',
      resourceId: reportId,
      subjectUserId: report.subjectUserId,
      metadata: {
        grantId: decision.grantId,
        grantType: decision.grantType,
      },
    });

    return report;
  }

  async getReportsForUser(userId: string, requestingUserId?: string): Promise<ReportOutput[]> {
    const viewerId = requestingUserId || userId;
    if (userId !== viewerId) {
      // Basic check: requestingUserId must have at least 'base' access to the user
      // to see the LIST of reports? Actually, maybe we only show reports they have access to.
      const reports = await this.reportRepository.findBySubjectId(userId) as ReportOutput[];
      const filtered = [];
      for (const r of reports) {
        const decision = await this.accessEvaluator.evaluate({
          subjectUserId: userId,
          viewerUserId: viewerId,
          resourceType: r.reportType,
        });
        if (decision.allowed) filtered.push(r);
      }
      return filtered;
    }

    await this.auditService.log({
      actorUserId: viewerId,
      actionType: AUDIT_ACTIONS.REPORT_VIEWED,
      resourceType: 'report',
      subjectUserId: userId,
      metadata: { scope: 'all_reports' },
    });
    return this.reportRepository.findBySubjectId(userId) as Promise<ReportOutput[]>;
  }

  async getUserReports(userId: string, requestingUserId?: string): Promise<ReportOutput[]> {
    return this.getReportsForUser(userId, requestingUserId);
  }

  async getTeamAggregate(teamId: string, requestingUserId: string): Promise<ReportOutput> {
    // Stub
    throw new Error('getTeamAggregate not implemented');
  }

  async getReportPdf(reportId: string, viewerUserId: string): Promise<Buffer> {
    const report = await this.getReport(reportId, viewerUserId);
    
    await this.auditService.log({
      actorUserId: viewerUserId,
      actionType: AUDIT_ACTIONS.REPORT_DOWNLOADED,
      resourceType: 'report',
      resourceId: report.id,
      subjectUserId: report.subjectUserId,
      metadata: { format: 'pdf' },
    });

    // In a real system, we might want to regenerate it or fetch from storage
    // For now, let's assume we can regenerate from renderedPayload.html or fetch from storageService
    if (report.renderedPayload?.html) {
      const template = await this.templateRepository.findById(report.contentVersionId!);
      return this.pdfGenerator.generateFromHtml(report.renderedPayload.html, {
        pageWidth: (template?.templateJson as ReportTemplate)?.pageSize?.width || 210,
        pageHeight: (template?.templateJson as ReportTemplate)?.pageSize?.height || 297,
        margins: (template?.templateJson as ReportTemplate)?.margins,
        printBackground: true,
        displayHeaderFooter: false,
      });
    }
    
    throw new Error('Report PDF data missing');
  }
}
