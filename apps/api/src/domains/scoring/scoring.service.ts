import type { IScoringRepository } from './scoring.repository';
import type { IRunRepository } from '../instrument/features/run/run.repository';
import type { IAuditService } from '../audit/audit.service';
import { scoringStrategyRegistry } from './strategies/scoring-strategy.registry';
import { registerScoringConfigFromDb } from './strategies/scoring-strategy.factory';
import { ScoredProfilePayloadSchema, type ScoredProfileOutput } from './scoring.types';
import type { IAccessEvaluator } from '../sharing/access-evaluator.service';
import { NotFoundError, AccessDeniedError } from '@/shared/errors/domain-error';
import { AUDIT_ACTIONS } from '../audit/audit.service';
import type { IInstrumentRepository } from '../instrument/instrument.repository';
import type { ScoringConfig } from '@dimensional/shared';

// Import all strategies so they self-register
import './strategies/base-instrument.strategy';

export interface IScoringService {
  scoreRun(runId: string): Promise<ScoredProfileOutput>;
  getProfileById(profileId: string, requestingUserId?: string): Promise<ScoredProfileOutput>;
  getProfilesForUser(userId: string, requestingUserId?: string): Promise<ScoredProfileOutput[]>;
  getUserProfiles(userId: string, requestingUserId?: string): Promise<ScoredProfileOutput[]>;
  setAccessEvaluator(evaluator: IAccessEvaluator): void;
}

export class ScoringService implements IScoringService {
  constructor(
    private readonly scoringRepository: IScoringRepository,
    private readonly runRepository: IRunRepository,
    private readonly auditService: IAuditService,
    private readonly instrumentRepository: IInstrumentRepository,
    private accessEvaluator?: IAccessEvaluator,
  ) {}

  /**
   * Late injection to avoid circular dependencies in container
   */
  setAccessEvaluator(evaluator: IAccessEvaluator) {
    this.accessEvaluator = evaluator;
  }

  async scoreRun(runId: string): Promise<ScoredProfileOutput> {
    const runData = await this.runRepository.getRunWithResponses(runId);
    
    if (!runData) {
      throw new NotFoundError('Run', runId);
    }

    const instrumentVersion = await this.instrumentRepository.findVersionById(runData.instrumentVersionId);
    if (!instrumentVersion) {
      throw new NotFoundError('Instrument version', runData.instrumentVersionId);
    }

    // Lazy-register the strategy from DB config if not already registered
    if (!scoringStrategyRegistry.has(`${instrumentVersion.scoringStrategyKey}`)) {
      const config = instrumentVersion.configJson as ScoringConfig;
      registerScoringConfigFromDb(config);
    }

    const strategy = scoringStrategyRegistry.get(instrumentVersion.scoringStrategyKey!);
    
    const runInput = {
      runId,
      userId: runData.userId,
      instrumentVersionId: runData.instrumentVersionId,
      responses: runData.responses.map(r => ({
        itemId: r.itemId,
        responseValue: r.responseValue,
        domainTag: r.domainTag,
        dimensionTag: r.dimensionTag,
        stateTag: r.stateTag,
        configJson: (r as any).configJson ?? null,
      })),
    } as const;

    // Validate consistency
    const consistency = strategy.validateConsistency(runInput);

    // Score
    const payload = strategy.score(runInput);

    // Validate output shape
    ScoredProfilePayloadSchema.parse(payload);

    // Persist
    const profile = await this.scoringRepository.create({
      userId: runData.userId,
      instrumentRunId: runId,
      scoringStrategyKey: strategy.key,
      scoringStrategyVersion: strategy.version,
      safetyBand: payload.domains.find(d => d.domain === 'safety')!.band,
      challengeBand: payload.domains.find(d => d.domain === 'challenge')!.band,
      playBand: payload.domains.find(d => d.domain === 'play')!.band,
      profilePayload: payload,
    });

    // Update the run with consistency and profile link
    await this.runRepository.markScored(runId, profile.id, consistency.score);

    await this.auditService.log({
      actorUserId: runData.userId,
      actionType: AUDIT_ACTIONS.PROFILE_SCORED,
      resourceType: 'scored_profile',
      resourceId: profile.id,
      subjectUserId: runData.userId,
      metadata: {
        instrumentRunId: runId,
        scoringStrategyKey: strategy.key,
        scoringStrategyVersion: strategy.version,
      },
    });

    return profile as ScoredProfileOutput;
  }

  async getProfileById(profileId: string, requestingUserId?: string): Promise<ScoredProfileOutput> {
    const profile = await this.scoringRepository.findById(profileId);
    if (!profile) {
      throw new NotFoundError('Scored profile', profileId);
    }

    if (requestingUserId) {
      if (this.accessEvaluator && profile.userId !== requestingUserId) {
        const decision = await this.accessEvaluator.evaluate({
          subjectUserId: profile.userId,
          viewerUserId: requestingUserId,
          resourceType: 'base', // Default to base access for profile view
        });
        
        if (!decision.allowed) {
          await this.auditService.log({
            actorUserId: requestingUserId,
            actionType: AUDIT_ACTIONS.ACCESS_DENIED,
            resourceType: 'scored_profile',
            resourceId: profileId,
            subjectUserId: profile.userId,
            metadata: { reason: decision.reason },
          });
          // Use 404 instead of 403 to prevent resource enumeration
          throw new NotFoundError('Scored profile', profileId);
        }
      }

      await this.auditService.log({
        actorUserId: requestingUserId,
        actionType: AUDIT_ACTIONS.PROFILE_VIEWED,
        resourceType: 'scored_profile',
        resourceId: profileId,
        subjectUserId: profile.userId,
      });
    }

    return profile as ScoredProfileOutput;
  }

  async getProfilesForUser(userId: string, requestingUserId?: string): Promise<ScoredProfileOutput[]> {
    if (requestingUserId && userId !== requestingUserId && this.accessEvaluator) {
      const decision = await this.accessEvaluator.evaluate({
        subjectUserId: userId,
        viewerUserId: requestingUserId,
        resourceType: 'base',
      });
      if (!decision.allowed) {
        throw new AccessDeniedError(requestingUserId, userId, decision.reason);
      }
    }

    if (requestingUserId) {
      await this.auditService.log({
        actorUserId: requestingUserId,
        actionType: AUDIT_ACTIONS.PROFILE_VIEWED,
        resourceType: 'scored_profile',
        subjectUserId: userId,
        metadata: { scope: 'all_profiles' },
      });
    }
    
    const profiles = await this.scoringRepository.findByUserId(userId);
    return profiles as ScoredProfileOutput[];
  }

  async getUserProfiles(userId: string, requestingUserId?: string): Promise<ScoredProfileOutput[]> {
    return this.getProfilesForUser(userId, requestingUserId);
  }
}
