import { describe, it, expect } from 'vitest';
import { ConfigDrivenScoringStrategy } from './config-driven-scoring.strategy';
import { ScoringConfig } from '@dimensional/shared';

const mockConfig: ScoringConfig = {
  version: 1,
  instrumentSlug: 'test-instrument',
  responseScale: { min: 1, max: 5, type: 'likert' },
  itemRules: [
    { itemId: 'item1', domain: 'safety', dimension: 'self', state: 'felt', weight: 1, reverseScored: false, maxResponseValue: 5 },
    { itemId: 'item2', domain: 'safety', dimension: 'self', state: 'expressed', weight: 1, reverseScored: false, maxResponseValue: 5 },
    { itemId: 'item3', domain: 'safety', dimension: 'others', state: 'felt', weight: 1, reverseScored: false, maxResponseValue: 5 },
    { itemId: 'item4', domain: 'safety', dimension: 'others', state: 'expressed', weight: 1, reverseScored: false, maxResponseValue: 5 },
    { itemId: 'item5', domain: 'safety', dimension: 'self', state: 'felt', weight: 1, reverseScored: false, maxResponseValue: 5 },
  ],
  dimensions: Array(6).fill({ dimension: 'self', domain: 'safety', aggregation: 'mean', bandThresholds: Array(5).fill({ band: 'balanced', min: 1, max: 6 }) as any }),
  domains: Array(3).fill({ domain: 'safety', aggregation: 'mean', feltAggregation: 'mean', expressedAggregation: 'mean', bandThresholds: Array(5).fill({ band: 'balanced', min: 1, max: 6 }) as any }),
  alignment: { gapMethod: 'absolute_difference', severityThresholds: { aligned: 0.5, mildDivergence: 1, significantDivergence: 1.5 }, directionLogic: 'expressed_minus_felt' },
  consistency: { enabled: true, method: 'straight_line_detection', threshold: 70, maxConsecutiveIdentical: 4 },
};

describe('A5: Consistency Checking', () => {
  it('should flag straight-line responses', () => {
    const strategy = new ConfigDrivenScoringStrategy(mockConfig);
    const runData = {
      runId: 'run1',
      userId: 'user1',
      instrumentVersionId: 'v1',
      responses: [
        { itemId: 'item1', responseValue: 3, domainTag: 'safety' },
        { itemId: 'item2', responseValue: 3, domainTag: 'safety' },
        { itemId: 'item3', responseValue: 3, domainTag: 'safety' },
        { itemId: 'item4', responseValue: 3, domainTag: 'safety' },
        { itemId: 'item5', responseValue: 3, domainTag: 'safety' },
      ] as any,
    };
    const result = strategy.validateConsistency(runData);
    expect(result.isConsistent).toBe(false);
    expect(result.score).toBeLessThan(70);
  });

  it('should pass varied responses', () => {
    const strategy = new ConfigDrivenScoringStrategy(mockConfig);
    const runData = {
      runId: 'run1',
      userId: 'user1',
      instrumentVersionId: 'v1',
      responses: [
        { itemId: 'item1', responseValue: 1, domainTag: 'safety' },
        { itemId: 'item2', responseValue: 2, domainTag: 'safety' },
        { itemId: 'item3', responseValue: 3, domainTag: 'safety' },
        { itemId: 'item4', responseValue: 4, domainTag: 'safety' },
        { itemId: 'item5', responseValue: 5, domainTag: 'safety' },
      ] as any,
    };
    const result = strategy.validateConsistency(runData);
    expect(result.isConsistent).toBe(true);
    expect(result.score).toBeGreaterThan(70);
  });
});
