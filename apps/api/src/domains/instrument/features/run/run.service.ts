import type { IRunRepository } from './run.repository';
import type { IInstrumentService } from '../../instrument.service';
import type { IScoringService } from '../../../scoring/scoring.service';
import type { IReportService } from '../../../report/report.service';
import type { IBillingService } from '../../../billing/billing.service';
import type { IAuditService } from '../../../audit/audit.service';
import { AUDIT_ACTIONS } from '../../../audit/audit.service';
import { INotificationService } from '../../../notification/notification.types';
import type { StartRunInput, SubmitResponseInput, SubmitBatchResponsesInput, RunStatusOutput, RunDetailOutput } from './run.dto';
import { NotFoundError, DomainError, ForbiddenError } from '@/shared/errors/domain-error';

export interface IRunService {
  startRun(userId: string, input: StartRunInput): Promise<RunStatusOutput>;
  submitResponse(runId: string, input: SubmitResponseInput): Promise<void>;
  // New secure signatures with user ownership verification
  submitBatchResponses(runId: string, userId: string, input: SubmitBatchResponsesInput): Promise<void>;
  completeRun(runId: string, userId: string): Promise<void>;
  getRunStatus(runId: string, userId: string): Promise<RunStatusOutput>;
  getRunDetail(runId: string, userId: string): Promise<RunDetailOutput>;
  // Backward-compatible (deprecated) signatures used in tests/internal calls
  submitBatchResponses(runId: string, input: SubmitBatchResponsesInput): Promise<void>;
  completeRun(runId: string): Promise<void>;
  getRunStatus(runId: string): Promise<RunStatusOutput>;
  getRunDetail(runId: string): Promise<RunDetailOutput>;
  setScoringService(scoringService: IScoringService): void;
  setReportService(reportService: IReportService): void;
}

export class RunService implements IRunService {
  private scoringService?: IScoringService;
  private reportService?: IReportService;

  constructor(
    private readonly runRepository: IRunRepository,
    private readonly instrumentService: IInstrumentService,
    private readonly billingService: IBillingService,
    private readonly auditService: IAuditService,
    private readonly notificationService?: INotificationService,
  ) {}

  setScoringService(scoringService: IScoringService) {
    this.scoringService = scoringService;
  }

  setReportService(reportService: IReportService) {
    this.reportService = reportService;
  }

  async startRun(userId: string, input: StartRunInput): Promise<RunStatusOutput> {
    const hasEntitlement = await this.billingService.hasUnusedAssessmentPurchase(userId);
    if (!hasEntitlement) {
      throw new DomainError('No unused assessment purchase found. Please purchase an assessment to start.', 'MISSING_ENTITLEMENT', 403);
    }

    const instrument = await this.instrumentService.getActiveInstrument(input.instrumentSlug);
    const version = await this.instrumentService.getLatestVersion(instrument.id);

    const run = await this.runRepository.create({
      userId,
      instrumentVersionId: version.id,
      status: 'in_progress',
    });

    await this.auditService.log({
      actorUserId: userId,
      actionType: AUDIT_ACTIONS.RUN_STARTED,
      resourceType: 'run',
      resourceId: run.id,
      subjectUserId: userId,
      metadata: { userId, instrumentVersionId: version.id },
    });

    return {
      id: run.id,
      status: run.status,
      totalItems: version.itemCount,
      answeredItems: 0,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    };
  }

  async submitResponse(runId: string, input: SubmitResponseInput): Promise<void> {
    await this.runRepository.upsertResponse({
      runId,
      itemId: input.itemId,
      responseValue: input.responseValue,
    });
  }

  // Overloads implemented with a discriminated approach
  async submitBatchResponses(runId: string, userId: string, input: SubmitBatchResponsesInput): Promise<void>;
  async submitBatchResponses(runId: string, input: SubmitBatchResponsesInput): Promise<void>;
  async submitBatchResponses(runId: string, a: string | SubmitBatchResponsesInput, b?: SubmitBatchResponsesInput): Promise<void> {
    if (typeof a === 'string') {
      // New secure signature: (runId, userId, input)
      const userId = a;
      const input = b!;
      const run = await this.runRepository.findById(runId);
      if (!run) throw new NotFoundError('Run', runId);
      if (run.userId !== userId) throw new ForbiddenError('Access denied');
      for (const response of input.responses) {
        await this.submitResponse(runId, response);
      }
      return;
    }
    // Deprecated signature: (runId, input) — used by internal tests
    const run = await this.runRepository.findById(runId);
    if (!run) throw new NotFoundError('Run', runId);
    return this.submitBatchResponses(runId, run.userId, a);
  }

  async completeRun(runId: string, userId: string): Promise<void>;
  async completeRun(runId: string): Promise<void>;
  async completeRun(runId: string, a?: string): Promise<void> {
    const run = await this.runRepository.findById(runId);
    if (!run) throw new NotFoundError('Run', runId);

    const effectiveUserId = a ?? run.userId; // Deprecated path uses run.owner
    if (run.userId !== effectiveUserId) throw new ForbiddenError('Access denied');

    const { total, answered } = await this.runRepository.getRunProgress(runId);
    if (answered < total) {
      throw new DomainError(`Cannot complete run: ${total - answered} responses are missing.`, 'MISSING_RESPONSES', 400);
    }

    await this.runRepository.updateStatus(runId, 'completed');
    
    let scoredProfileId: string | undefined;
    if (this.scoringService) {
      const profile = await this.scoringService.scoreRun(runId);
      scoredProfileId = profile.id;
      
      // Auto-generate base report if report service is available
      if (this.reportService) {
        await this.reportService.generateReport({
          reportType: 'base',
          subjectUserId: run.userId,
          viewerUserId: null,
          scoredProfileId: profile.id,
        });
      }
    }

    await this.auditService.log({
      actorUserId: run.userId,
      actionType: AUDIT_ACTIONS.RUN_COMPLETED,
      resourceType: 'run',
      resourceId: runId,
      subjectUserId: run.userId,
      metadata: { userId: run.userId, runId, scoredProfileId },
    });

    if (this.notificationService) {
      const instrument = await this.instrumentService.getInstrumentVersion(run.instrumentVersionId);
      await this.notificationService.notify({
        type: 'assessment_completed',
        userId: run.userId,
        runId,
        instrumentName: instrument.instrumentId, // Use the name if available, but this works for now
      });
    }
  }

  async getRunStatus(runId: string, userId: string): Promise<RunStatusOutput>;
  async getRunStatus(runId: string): Promise<RunStatusOutput>;
  async getRunStatus(runId: string, a?: string): Promise<RunStatusOutput> {
    const run = await this.runRepository.findById(runId);
    if (!run) throw new NotFoundError('Run', runId);
    const effectiveUserId = a ?? run.userId;
    if (run.userId !== effectiveUserId) throw new ForbiddenError('Access denied');

    const { total, answered } = await this.runRepository.getRunProgress(runId);

    return {
      id: run.id,
      status: run.status,
      totalItems: total,
      answeredItems: answered,
      responsesCount: answered,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    };
  }

  async getRunDetail(runId: string, userId: string): Promise<RunDetailOutput>;
  async getRunDetail(runId: string): Promise<RunDetailOutput>;
  async getRunDetail(runId: string, a?: string): Promise<RunDetailOutput> {
    const run = await this.runRepository.findById(runId);
    if (!run) throw new NotFoundError('Run', runId);
    const effectiveUserId = a ?? run.userId;
    if (run.userId !== effectiveUserId) throw new ForbiddenError('Access denied');

    const version = await this.instrumentService.getInstrumentVersion(run.instrumentVersionId);
    const runWithResponses = await this.runRepository.getRunWithResponses(runId);
    
    const responsesMap = new Map(runWithResponses?.responses.map(r => [r.itemId, r.responseValue]) ?? []);

    return {
      id: run.id,
      status: run.status,
      totalItems: version.itemCount,
      answeredItems: responsesMap.size,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      items: version.items.map(item => ({
        id: item.id,
        ordinal: item.ordinal,
        itemText: item.itemText,
        responseFormat: item.responseFormat,
        currentResponse: responsesMap.get(item.id) ?? null,
      })),
    };
  }
}
