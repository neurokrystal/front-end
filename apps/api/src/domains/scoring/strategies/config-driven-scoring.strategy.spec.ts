import { describe, it, expect } from 'vitest';
import { ConfigDrivenScoringStrategy } from './config-driven-scoring.strategy';
import { ScoringConfig } from '@dimensional/shared';

describe('ConfigDrivenScoringStrategy', () => {
  const mockConfig: ScoringConfig = {
    version: 1,
    instrumentSlug: 'test-instrument',
    responseScale: { min: 1, max: 5, type: 'likert' },
    itemRules: [
      { itemId: 'item1', domain: 'safety' as const, dimension: 'self' as const, state: 'felt' as const, weight: 1, reverseScored: false, maxResponseValue: 5 },
      { itemId: 'item2', domain: 'safety' as const, dimension: 'self' as const, state: 'expressed' as const, weight: 1, reverseScored: false, maxResponseValue: 5 },
      { itemId: 'item3', domain: 'safety' as const, dimension: 'others' as const, state: 'felt' as const, weight: 1, reverseScored: false, maxResponseValue: 5 },
    ],
    dimensions: [
      { 
        dimension: 'self', domain: 'safety', aggregation: 'mean', 
        bandThresholds: [
          { band: 'very_low', min: 1, max: 1.8 },
          { band: 'low', min: 1.8, max: 2.6 },
          { band: 'almost_balanced', min: 2.6, max: 3.4 },
          { band: 'balanced', min: 3.4, max: 4.2 },
          { band: 'high_excessive', min: 4.2, max: 5.1 },
        ] as any
      },
      { 
        dimension: 'others', domain: 'safety', aggregation: 'mean', 
        bandThresholds: [
          { band: 'very_low', min: 1, max: 1.8 },
          { band: 'low', min: 1.8, max: 2.6 },
          { band: 'almost_balanced', min: 2.6, max: 3.4 },
          { band: 'balanced', min: 3.4, max: 4.2 },
          { band: 'high_excessive', min: 4.2, max: 5.1 },
        ] as any
      },
      { 
        dimension: 'past', domain: 'challenge', aggregation: 'mean', 
        bandThresholds: [
          { band: 'very_low', min: 1, max: 1.8 },
          { band: 'low', min: 1.8, max: 2.6 },
          { band: 'almost_balanced', min: 2.6, max: 3.4 },
          { band: 'balanced', min: 3.4, max: 4.2 },
          { band: 'high_excessive', min: 4.2, max: 5.1 },
        ] as any
      },
      { 
        dimension: 'future', domain: 'challenge', aggregation: 'mean', 
        bandThresholds: [
          { band: 'very_low', min: 1, max: 1.8 },
          { band: 'low', min: 1.8, max: 2.6 },
          { band: 'almost_balanced', min: 2.6, max: 3.4 },
          { band: 'balanced', min: 3.4, max: 4.2 },
          { band: 'high_excessive', min: 4.2, max: 5.1 },
        ] as any
      },
      { 
        dimension: 'senses', domain: 'play', aggregation: 'mean', 
        bandThresholds: [
          { band: 'very_low', min: 1, max: 1.8 },
          { band: 'low', min: 1.8, max: 2.6 },
          { band: 'almost_balanced', min: 2.6, max: 3.4 },
          { band: 'balanced', min: 3.4, max: 4.2 },
          { band: 'high_excessive', min: 4.2, max: 5.1 },
        ] as any
      },
      { 
        dimension: 'perception', domain: 'play', aggregation: 'mean', 
        bandThresholds: [
          { band: 'very_low', min: 1, max: 1.8 },
          { band: 'low', min: 1.8, max: 2.6 },
          { band: 'almost_balanced', min: 2.6, max: 3.4 },
          { band: 'balanced', min: 3.4, max: 4.2 },
          { band: 'high_excessive', min: 4.2, max: 5.1 },
        ] as any
      },
    ],
    domains: [
      { 
        domain: 'safety', aggregation: 'mean', feltAggregation: 'mean', expressedAggregation: 'mean',
        bandThresholds: [
          { band: 'very_low', min: 1, max: 1.8 },
          { band: 'low', min: 1.8, max: 2.6 },
          { band: 'almost_balanced', min: 2.6, max: 3.4 },
          { band: 'balanced', min: 3.4, max: 4.2 },
          { band: 'high_excessive', min: 4.2, max: 5.1 },
        ] as any
      },
      { 
        domain: 'challenge', aggregation: 'mean', feltAggregation: 'mean', expressedAggregation: 'mean', 
        bandThresholds: [
          { band: 'very_low', min: 1, max: 1.8 },
          { band: 'low', min: 1.8, max: 2.6 },
          { band: 'almost_balanced', min: 2.6, max: 3.4 },
          { band: 'balanced', min: 3.4, max: 4.2 },
          { band: 'high_excessive', min: 4.2, max: 5.1 },
        ] as any
      },
      { 
        domain: 'play', aggregation: 'mean', feltAggregation: 'mean', expressedAggregation: 'mean', 
        bandThresholds: [
          { band: 'very_low', min: 1, max: 1.8 },
          { band: 'low', min: 1.8, max: 2.6 },
          { band: 'almost_balanced', min: 2.6, max: 3.4 },
          { band: 'balanced', min: 3.4, max: 4.2 },
          { band: 'high_excessive', min: 4.2, max: 5.1 },
        ] as any
      },
    ],
    alignment: {
      gapMethod: 'absolute_difference',
      severityThresholds: {
        aligned: 0.5,
        mildDivergence: 1.0,
        significantDivergence: 1.5,
      },
      directionLogic: 'expressed_minus_felt',
    },
    consistency: {
      enabled: true,
      method: 'intra_domain_variance',
      threshold: 70,
    },
  };

  it('should score a run correctly', () => {
    const strategy = new ConfigDrivenScoringStrategy(mockConfig);
    const runData = {
      runId: 'run1',
      userId: 'user1',
      instrumentVersionId: 'v1',
      responses: [
        { itemId: 'item1', responseValue: 4, domainTag: 'safety', dimensionTag: 'self', stateTag: 'felt', configJson: null },
        { itemId: 'item2', responseValue: 2, domainTag: 'safety', dimensionTag: 'self', stateTag: 'expressed', configJson: null },
        { itemId: 'item3', responseValue: 4, domainTag: 'safety', dimensionTag: 'others', stateTag: 'felt', configJson: null },
      ],
    };

    const result = strategy.score(runData);

    // Dimension: self (item1, item2) -> (4+2)/2 = 3.0 -> almost_balanced
    const selfDim = result.dimensions.find(d => d.dimension === 'self');
    expect(selfDim?.rawScore).toBe(3);
    expect(selfDim?.band).toBe('almost_balanced');

    // Domain: safety (item1, item2, item3) -> (4+2+4)/3 = 3.33 -> almost_balanced
    const safetyDom = result.domains.find(d => d.domain === 'safety');
    expect(safetyDom?.rawScore).toBe(3.33);
    expect(safetyDom?.feltScore).toBe(4); // (item1+item3)/2 = 4
    expect(safetyDom?.expressedScore).toBe(2); // (item2)/1 = 2
    expect(safetyDom?.band).toBe('almost_balanced');

    // Alignment: safety expressed(2) - felt(4) = -2 (gap 2) -> masking_downward, severe
    const safetyAlign = result.alignments.find(a => a.domain === 'safety');
    expect(safetyAlign?.gapMagnitude).toBe(2);
    expect(safetyAlign?.direction).toBe('masking_downward');
    expect(safetyAlign?.severity).toBe('severe_divergence');
  });

  it('should handle reverse scoring', () => {
    const configWithReverse: ScoringConfig = {
      ...mockConfig,
      itemRules: [
        { itemId: 'item1', domain: 'safety' as const, dimension: 'self' as const, state: 'felt' as const, weight: 1, reverseScored: true, maxResponseValue: 5 },
      ],
    };
    const strategy = new ConfigDrivenScoringStrategy(configWithReverse);
    const runData = {
      runId: 'run1',
      userId: 'user1',
      instrumentVersionId: 'v1',
      responses: [
        { itemId: 'item1', responseValue: 1, domainTag: 'safety', dimensionTag: 'self', stateTag: 'felt', configJson: null },
      ],
    };

    const result = strategy.score(runData);
    // 1 reversed on 1-5 scale is (5+1)-1 = 5
    const selfDim = result.dimensions.find(d => d.dimension === 'self');
    expect(selfDim?.rawScore).toBe(5);
  });
});
