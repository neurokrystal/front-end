import { describe, it, expect } from 'vitest';
import { ScoringConfigSchema } from '@dimensional/shared';

const validConfig = {
  version: 1,
  instrumentSlug: 'base-diagnostic',
  responseScale: { min: 1, max: 5, type: 'likert' },
  itemRules: [],
  dimensions: [
    { dimension: 'self', domain: 'safety', aggregation: 'mean', bandThresholds: Array(5).fill({ band: 'balanced', min: 1, max: 2 }) as any },
    { dimension: 'others', domain: 'safety', aggregation: 'mean', bandThresholds: Array(5).fill({ band: 'balanced', min: 1, max: 2 }) as any },
    { dimension: 'past', domain: 'challenge', aggregation: 'mean', bandThresholds: Array(5).fill({ band: 'balanced', min: 1, max: 2 }) as any },
    { dimension: 'future', domain: 'challenge', aggregation: 'mean', bandThresholds: Array(5).fill({ band: 'balanced', min: 1, max: 2 }) as any },
    { dimension: 'senses', domain: 'play', aggregation: 'mean', bandThresholds: Array(5).fill({ band: 'balanced', min: 1, max: 2 }) as any },
    { dimension: 'perception', domain: 'play', aggregation: 'mean', bandThresholds: Array(5).fill({ band: 'balanced', min: 1, max: 2 }) as any },
  ],
  domains: [
    { domain: 'safety', aggregation: 'mean', feltAggregation: 'mean', expressedAggregation: 'mean', bandThresholds: Array(5).fill({ band: 'balanced', min: 1, max: 2 }) as any },
    { domain: 'challenge', aggregation: 'mean', feltAggregation: 'mean', expressedAggregation: 'mean', bandThresholds: Array(5).fill({ band: 'balanced', min: 1, max: 2 }) as any },
    { domain: 'play', aggregation: 'mean', feltAggregation: 'mean', expressedAggregation: 'mean', bandThresholds: Array(5).fill({ band: 'balanced', min: 1, max: 2 }) as any },
  ],
  alignment: {
    gapMethod: 'absolute_difference',
    severityThresholds: { aligned: 0.5, mildDivergence: 1.0, significantDivergence: 1.5 },
    directionLogic: 'expressed_minus_felt',
  },
  consistency: { enabled: true, method: 'intra_domain_variance', threshold: 70 },
};

describe('A1: Scoring Config Schema Validation', () => {
  it('should pass valid config', () => {
    expect(() => ScoringConfigSchema.parse(validConfig)).not.toThrow();
  });

  it('should throw on invalid config (missing scoreGroups AND dimensions)', () => {
    const invalid = { ...validConfig, dimensions: [], scoreGroups: [] };
    expect(() => ScoringConfigSchema.parse(invalid)).toThrow();
  });

  it('should throw on invalid config (wrong aggregation value)', () => {
    const invalid = { ...validConfig };
    (invalid.domains[0] as any).aggregation = 'invalid_method';
    expect(() => ScoringConfigSchema.parse(invalid)).toThrow();
  });
});
