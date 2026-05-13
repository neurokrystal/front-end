import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScoringService } from './scoring.service';
import { scoringStrategyRegistry } from './strategies/scoring-strategy.registry';
import type { IScoringStrategy } from './strategies/scoring-strategy.interface';

const testStrategyKey = `test-strategy-${Math.random()}`;

const mockStrategy: IScoringStrategy = {
  key: testStrategyKey,
  version: 1,
  score: vi.fn().mockReturnValue({
    domains: [
      { domain: 'safety', band: 'balanced', rawScore: 10, feltScore: 5, expressedScore: 5 },
      { domain: 'challenge', band: 'balanced', rawScore: 10, feltScore: 5, expressedScore: 5 },
      { domain: 'play', band: 'balanced', rawScore: 10, feltScore: 5, expressedScore: 5 },
    ],
    dimensions: [
      { dimension: 'self', domain: 'safety', band: 'balanced', rawScore: 5 },
      { dimension: 'others', domain: 'safety', band: 'balanced', rawScore: 5 },
      { dimension: 'past', domain: 'challenge', band: 'balanced', rawScore: 5 },
      { dimension: 'future', domain: 'challenge', band: 'balanced', rawScore: 5 },
      { dimension: 'senses', domain: 'play', band: 'balanced', rawScore: 5 },
      { dimension: 'perception', domain: 'play', band: 'balanced', rawScore: 5 },
    ],
    alignments: [
      { domain: 'safety', direction: 'aligned', severity: 'aligned', gapMagnitude: 0 },
      { domain: 'challenge', direction: 'aligned', severity: 'aligned', gapMagnitude: 0 },
      { domain: 'play', direction: 'aligned', severity: 'aligned', gapMagnitude: 0 },
    ],
  }),
  validateConsistency: vi.fn().mockReturnValue({ isConsistent: true, score: 100 }),
};

scoringStrategyRegistry.register(mockStrategy);

describe('ScoringService', () => {
  let service: ScoringService;
  let scoringRepository: any;
  let runRepository: any;
  let auditService: any;
  let instrumentRepository: any;

  beforeEach(() => {
    scoringRepository = {
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'profile-1', ...data })),
    };
    runRepository = {
      getRunWithResponses: vi.fn().mockResolvedValue({
        id: 'run-1',
        userId: 'user-1',
        instrumentVersionId: 'v1',
        responses: [
           { itemId: 'i1', responseValue: 5, domainTag: 'safety', dimensionTag: 'self', stateTag: 'felt' }
        ],
      }),
      markScored: vi.fn().mockResolvedValue(undefined),
    };
    auditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };
    instrumentRepository = {
      findVersionById: vi.fn().mockResolvedValue({
        id: 'v1',
        scoringStrategyKey: testStrategyKey,
        configJson: {},
      }),
    };

    service = new ScoringService(scoringRepository, runRepository, auditService, instrumentRepository);
  });

  it('should score a run successfully', async () => {
    const result = await service.scoreRun('run-1');
    
    expect(result.id).toBe('profile-1');
    expect(scoringRepository.create).toHaveBeenCalled();
    expect(runRepository.markScored).toHaveBeenCalledWith('run-1', 'profile-1', 100);
    expect(auditService.log).toHaveBeenCalled();
  });
});
