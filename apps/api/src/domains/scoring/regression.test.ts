import { describe, it, expect, vi } from 'vitest';
import { ConfigDrivenScoringStrategy } from './strategies/config-driven-scoring.strategy';
import { ScoringConfigSchema } from '@dimensional/shared';
import { MOCK_SCORING_CONFIG } from '../../test/fixtures';
import { ZodError } from 'zod';
import { registerScoringConfigFromDb } from './strategies/scoring-strategy.factory';
import { scoringStrategyRegistry } from './strategies/scoring-strategy.registry';

describe('Category 1: Scoring Engine Regression', () => {
  const NEW_CONFIG = {
    version: 1,
    instrumentSlug: 'new-format',
    responseScale: { min: 1, max: 5, type: 'likert' as const },
    itemRules: [
      { itemId: 'i1', domain: 'safety', scoreGroup: 'sg1', weight: 1 },
      { itemId: 'i2', domain: 'safety', scoreGroup: 'sg1', weight: 1 },
      { itemId: 'i3', domain: 'safety', scoreGroup: 'sg1', weight: 1 },
      { itemId: 'i4', domain: 'safety', scoreGroup: 'sg1', weight: 1 },
      { itemId: 'i5', domain: 'safety', scoreGroup: 'sg2', weight: 2 },
    ],
    scoreGroups: [
      {
        key: 'sg1',
        label: 'SG1',
        domain: 'safety' as const,
        category: 'feelings',
        aggregation: 'sum' as const,
        rawScoreRange: { min: 4, max: 20 },
        normalise: true,
      },
      {
        key: 'sg2',
        label: 'SG2',
        domain: 'safety' as const,
        category: 'behaviours',
        aggregation: 'mean' as const,
        rawScoreRange: { min: 1, max: 5 },
        normalise: true,
      }
    ],
    computedFields: [
      {
        key: 'cf_diff',
        label: 'Diff',
        formula: {
          type: 'difference' as const,
          inputs: [
            { sourceKey: 'sg1', sourceType: 'score_group' as const, useValue: 'percentage' as const },
            { sourceKey: 'sg2', sourceType: 'score_group' as const, useValue: 'percentage' as const },
          ]
        },
        directionLogic: { positiveLabel: 'pos', negativeLabel: 'neg', neutralLabel: 'neu', neutralThreshold: 5 }
      }
    ],
    domainBandThresholds: [
      {
        domain: 'safety' as const,
        bandThresholds: [
          { band: 'very_low', min: 0, max: 20 },
          { band: 'low', min: 20, max: 40 },
          { band: 'almost_balanced', min: 40, max: 60 },
          { band: 'balanced', min: 60, max: 80 },
          { band: 'high_excessive', min: 80, max: 101 },
        ]
      }
    ]
  };

  it('1.1 Valid NEW-format scoring config parses via ScoringConfigSchema', () => {
    expect(() => ScoringConfigSchema.parse(NEW_CONFIG)).not.toThrow();
  });

  it('1.2 Valid OLD-format scoring config still parses (backward compat)', () => {
    expect(() => ScoringConfigSchema.parse(MOCK_SCORING_CONFIG)).not.toThrow();
  });

  it('1.3 Invalid config (missing scoreGroups AND dimensions) throws ZodError', () => {
    const invalid = { ...NEW_CONFIG, scoreGroups: undefined, dimensions: undefined };
    expect(() => ScoringConfigSchema.parse(invalid)).toThrow(ZodError);
  });

  it('1.4 Standard item scores map correctly (response 4 → scored value 4)', () => {
    const strategy = new ConfigDrivenScoringStrategy(NEW_CONFIG as any);
    const res = strategy.score({ responses: [{ itemId: 'i1', responseValue: 4 }] } as any);
    expect(res.scoreGroups?.find(g => g.key === 'sg1')?.rawScore).toBe(4);
  });

  it('1.5 Reverse-scored item inverts correctly (response 4 on 1-5 → value 2)', () => {
    const config = {
      ...NEW_CONFIG,
      itemRules: [{ itemId: 'i1', domain: 'safety', scoreGroup: 'sg1', reverseScored: true, maxResponseValue: 5 }]
    };
    const strategy = new ConfigDrivenScoringStrategy(config as any);
    const res = strategy.score({ responses: [{ itemId: 'i1', responseValue: 4 }] } as any);
    expect(res.scoreGroups?.find(g => g.key === 'sg1')?.rawScore).toBe(2);
  });

  it('1.6 Weighted item: weight 2 doubles contribution', () => {
    const strategy = new ConfigDrivenScoringStrategy(NEW_CONFIG as any);
    // sg2 uses mean aggregation. (item i5 weight 2). 
    // Wait, my implementation of aggregate 'mean' doesn't use weights yet?
    // Let's check aggregate in strategy.
    
    // Ah! My aggregate only handles 'mean', 'sum', 'weighted_mean'.
    // Default is 'mean'.
    
    const config = {
      ...NEW_CONFIG,
      scoreGroups: [
        NEW_CONFIG.scoreGroups[0],
        { ...NEW_CONFIG.scoreGroups[1], aggregation: 'weighted_mean' }
      ],
      itemRules: [
        ...NEW_CONFIG.itemRules,
        { itemId: 'i-extra', domain: 'safety', scoreGroup: 'sg2', weight: 1 }
      ]
    };
    const strategy2 = new ConfigDrivenScoringStrategy(config as any);
    const res = strategy2.score({
      responses: [
        { itemId: 'i5', responseValue: 4 }, // weight 2
        { itemId: 'i-extra', responseValue: 1 }, // weight 1
      ]
    } as any);
    // (4*2 + 1*1) / (2 + 1) = 9 / 3 = 3
    expect(res.scoreGroups?.find(g => g.key === 'sg2')?.rawScore).toBe(3);
  });

  it('1.7 Null responses excluded from scoring', () => {
    const strategy = new ConfigDrivenScoringStrategy(NEW_CONFIG as any);
    const res = strategy.score({
      responses: [
        { itemId: 'i1', responseValue: 4 },
        { itemId: 'i2', responseValue: null },
      ]
    } as any);
    expect(res.scoreGroups?.find(g => g.key === 'sg1')?.rawScore).toBe(4);
  });

  it('1.8 Score group sum aggregation: [3, 4, 5, 2] → raw 14', () => {
    const strategy = new ConfigDrivenScoringStrategy(NEW_CONFIG as any);
    const res = strategy.score({
      responses: [
        { itemId: 'i1', responseValue: 3 },
        { itemId: 'i2', responseValue: 4 },
        { itemId: 'i3', responseValue: 5 },
        { itemId: 'i4', responseValue: 2 },
      ]
    } as any);
    expect(res.scoreGroups?.find(g => g.key === 'sg1')?.rawScore).toBe(14);
  });

  it('1.9 Score group mean aggregation: [3, 4, 5, 2] → mean 3.5', () => {
    const config = {
      ...NEW_CONFIG,
      scoreGroups: [{ ...NEW_CONFIG.scoreGroups[0], aggregation: 'mean' }]
    };
    const strategy = new ConfigDrivenScoringStrategy(config as any);
    const res = strategy.score({
      responses: [
        { itemId: 'i1', responseValue: 3 },
        { itemId: 'i2', responseValue: 4 },
        { itemId: 'i3', responseValue: 5 },
        { itemId: 'i4', responseValue: 2 },
      ]
    } as any);
    expect(res.scoreGroups?.find(g => g.key === 'sg1')?.rawScore).toBe(3.5);
  });

  it('1.10 Percentage normalisation: raw 14 on range 4-20 → 62.5%', () => {
    const strategy = new ConfigDrivenScoringStrategy(NEW_CONFIG as any);
    const res = strategy.score({
      responses: [
        { itemId: 'i1', responseValue: 3 },
        { itemId: 'i2', responseValue: 4 },
        { itemId: 'i3', responseValue: 5 },
        { itemId: 'i4', responseValue: 2 },
      ]
    } as any);
    expect(res.scoreGroups?.find(g => g.key === 'sg1')?.percentage).toBe(62.5);
  });

  it('1.11 Percentage normalisation: raw at minimum (4 on 4-20) → 0%', () => {
    const strategy = new ConfigDrivenScoringStrategy(NEW_CONFIG as any);
    const res = strategy.score({
      responses: [{ itemId: 'i1', responseValue: 1 }, { itemId: 'i2', responseValue: 1 }, { itemId: 'i3', responseValue: 1 }, { itemId: 'i4', responseValue: 1 }]
    } as any);
    expect(res.scoreGroups?.find(g => g.key === 'sg1')?.percentage).toBe(0);
  });

  it('1.12 Percentage normalisation: raw at maximum (20 on 4-20) → 100%', () => {
    const strategy = new ConfigDrivenScoringStrategy(NEW_CONFIG as any);
    const res = strategy.score({
      responses: [{ itemId: 'i1', responseValue: 5 }, { itemId: 'i2', responseValue: 5 }, { itemId: 'i3', responseValue: 5 }, { itemId: 'i4', responseValue: 5 }]
    } as any);
    expect(res.scoreGroups?.find(g => g.key === 'sg1')?.percentage).toBe(100);
  });

  it('1.13 Band resolution on percentage scale: 62.5% → correct band', () => {
    const strategy = new ConfigDrivenScoringStrategy(NEW_CONFIG as any);
    const res = strategy.score({
      responses: [
        { itemId: 'i1', responseValue: 3 },
        { itemId: 'i2', responseValue: 4 },
        { itemId: 'i3', responseValue: 5 },
        { itemId: 'i4', responseValue: 2 },
      ]
    } as any);
    // Domain level percentage: (3+4+5+2)/4 = 14/4 = 3.5. (3.5-1)/4*100 = 62.5
    expect(res.domains.find(d => d.domain === 'safety')?.band).toBe('balanced');
  });

  it('1.14 Band resolution: edge case on threshold boundary', () => {
    const strategy = new ConfigDrivenScoringStrategy(NEW_CONFIG as any);
    // 40% exactly
    const res = strategy.score({
       responses: [
         { itemId: 'i1', responseValue: 2.6 },
         { itemId: 'i2', responseValue: 2.6 },
         { itemId: 'i3', responseValue: 2.6 },
         { itemId: 'i4', responseValue: 2.6 },
       ]
    } as any);
    // (2.6-1)/4*100 = 1.6/4*100 = 40
    // Thresholds: [20, 40) is low, [40, 60) is almost_balanced
    expect(res.domains.find(d => d.domain === 'safety')?.band).toBe('almost_balanced');
  });

  it('1.15 Computed field: difference formula (A=70%, B=40%) → 30', () => {
    const config = {
      ...NEW_CONFIG,
      scoreGroups: [
        { key: 'A', label: 'A', domain: 'safety', category: 'x', aggregation: 'sum', rawScoreRange: { min: 0, max: 100 }, normalise: true },
        { key: 'B', label: 'B', domain: 'safety', category: 'y', aggregation: 'sum', rawScoreRange: { min: 0, max: 100 }, normalise: true },
      ],
      computedFields: [{ key: 'res', label: 'Res', formula: { type: 'difference', inputs: [{ sourceKey: 'A', sourceType: 'score_group', useValue: 'percentage' }, { sourceKey: 'B', sourceType: 'score_group', useValue: 'percentage' }] } }],
      itemRules: [{ itemId: 'ia', domain: 'safety', scoreGroup: 'A' }, { itemId: 'ib', domain: 'safety', scoreGroup: 'B' }]
    };
    const strategy = new ConfigDrivenScoringStrategy(config as any);
    const res = strategy.score({
      responses: [{ itemId: 'ia', responseValue: 70 }, { itemId: 'ib', responseValue: 40 }]
    } as any);
    expect(res.computedFields?.find(f => f.key === 'res')?.numericValue).toBe(30);
  });

  it('1.16 Computed field: absolute_difference → 30', () => {
    const config = {
      ...NEW_CONFIG,
      scoreGroups: [
        { key: 'A', label: 'A', domain: 'safety', category: 'x', aggregation: 'sum', rawScoreRange: { min: 0, max: 100 }, normalise: true },
        { key: 'B', label: 'B', domain: 'safety', category: 'y', aggregation: 'sum', rawScoreRange: { min: 0, max: 100 }, normalise: true },
      ],
      computedFields: [{ key: 'res', label: 'Res', formula: { type: 'absolute_difference', inputs: [{ sourceKey: 'B', sourceType: 'score_group', useValue: 'percentage' }, { sourceKey: 'A', sourceType: 'score_group', useValue: 'percentage' }] } }],
      itemRules: [{ itemId: 'ia', domain: 'safety', scoreGroup: 'A' }, { itemId: 'ib', domain: 'safety', scoreGroup: 'B' }]
    };
    const strategy = new ConfigDrivenScoringStrategy(config as any);
    const res = strategy.score({
      responses: [{ itemId: 'ia', responseValue: 70 }, { itemId: 'ib', responseValue: 40 }]
    } as any);
    expect(res.computedFields?.find(f => f.key === 'res')?.numericValue).toBe(30);
  });

  it('1.17 Computed field: ratio → 1.75', () => {
    const config = {
      ...NEW_CONFIG,
      scoreGroups: [
        { key: 'A', label: 'A', domain: 'safety', category: 'x', aggregation: 'sum', rawScoreRange: { min: 0, max: 100 }, normalise: true },
        { key: 'B', label: 'B', domain: 'safety', category: 'y', aggregation: 'sum', rawScoreRange: { min: 0, max: 100 }, normalise: true },
      ],
      computedFields: [{ key: 'res', label: 'Res', formula: { type: 'ratio', inputs: [{ sourceKey: 'A', sourceType: 'score_group', useValue: 'percentage' }, { sourceKey: 'B', sourceType: 'score_group', useValue: 'percentage' }] } }],
      itemRules: [{ itemId: 'ia', domain: 'safety', scoreGroup: 'A' }, { itemId: 'ib', domain: 'safety', scoreGroup: 'B' }]
    };
    const strategy = new ConfigDrivenScoringStrategy(config as any);
    const res = strategy.score({
      responses: [{ itemId: 'ia', responseValue: 70 }, { itemId: 'ib', responseValue: 40 }]
    } as any);
    expect(res.computedFields?.find(f => f.key === 'res')?.numericValue).toBe(1.75);
  });

  it('1.18 Computed field: custom_expression "($0 - $1) / ($0 + $1) * 100" → 27.27', () => {
    const config = {
      ...NEW_CONFIG,
      scoreGroups: [
        { key: 'A', label: 'A', domain: 'safety', category: 'x', aggregation: 'sum', rawScoreRange: { min: 0, max: 100 }, normalise: true },
        { key: 'B', label: 'B', domain: 'safety', category: 'y', aggregation: 'sum', rawScoreRange: { min: 0, max: 100 }, normalise: true },
      ],
      computedFields: [{ key: 'res', label: 'Res', formula: { type: 'custom_expression', expression: "($0 - $1) / ($0 + $1) * 100", inputs: [{ sourceKey: 'A', sourceType: 'score_group', useValue: 'percentage' }, { sourceKey: 'B', sourceType: 'score_group', useValue: 'percentage' }] } }],
      itemRules: [{ itemId: 'ia', domain: 'safety', scoreGroup: 'A' }, { itemId: 'ib', domain: 'safety', scoreGroup: 'B' }]
    };
    const strategy = new ConfigDrivenScoringStrategy(config as any);
    const res = strategy.score({
      responses: [{ itemId: 'ia', responseValue: 70 }, { itemId: 'ib', responseValue: 40 }]
    } as any);
    // (70-40)/(70+40)*100 = 30/110*100 = 27.2727...
    expect(res.computedFields?.find(f => f.key === 'res')?.numericValue).toBe(27.27);
  });

  it('1.19 Computed field: direction logic (positive → positiveLabel)', () => {
    const strategy = new ConfigDrivenScoringStrategy(NEW_CONFIG as any);
    const res = strategy.score({
      responses: [{ itemId: 'i1', responseValue: 5 }, { itemId: 'i2', responseValue: 5 }, { itemId: 'i3', responseValue: 5 }, { itemId: 'i4', responseValue: 5 }, { itemId: 'i5', responseValue: 1 }]
    } as any);
    // sg1 raw=20, percentage=100. sg2 raw=1, percentage=0. Diff = 100.
    expect(res.computedFields?.find(f => f.key === 'cf_diff')?.direction).toBe('pos');
  });

  it('1.20 Computed field: direction logic (negative → negativeLabel)', () => {
    const strategy = new ConfigDrivenScoringStrategy(NEW_CONFIG as any);
    const res = strategy.score({
      responses: [{ itemId: 'i1', responseValue: 1 }, { itemId: 'i2', responseValue: 1 }, { itemId: 'i3', responseValue: 1 }, { itemId: 'i4', responseValue: 1 }, { itemId: 'i5', responseValue: 5 }]
    } as any);
    // sg1 raw=4, percentage=0. sg2 raw=5, percentage=100. Diff = -100.
    expect(res.computedFields?.find(f => f.key === 'cf_diff')?.direction).toBe('neg');
  });

  it('1.21 Computed field: direction logic (within neutral threshold → neutralLabel)', () => {
    const strategy = new ConfigDrivenScoringStrategy(NEW_CONFIG as any);
    const res = strategy.score({
      responses: [{ itemId: 'i1', responseValue: 3 }, { itemId: 'i2', responseValue: 3 }, { itemId: 'i3', responseValue: 3 }, { itemId: 'i4', responseValue: 3 }, { itemId: 'i5', responseValue: 3 }]
    } as any);
    // sg1 raw=12, percentage=50. sg2 raw=3, percentage=50. Diff = 0.
    expect(res.computedFields?.find(f => f.key === 'cf_diff')?.direction).toBe('neu');
  });

  it('1.22 Computed field referencing another computed field (chained)', () => {
    const config = {
      ...NEW_CONFIG,
      computedFields: [
        { key: 'cf1', label: 'CF1', formula: { type: 'difference', inputs: [{ sourceKey: 'sg1', sourceType: 'score_group', useValue: 'percentage' }, { sourceKey: 'sg2', sourceType: 'score_group', useValue: 'percentage' }] } },
        { key: 'cf2', label: 'CF2', formula: { type: 'ratio', inputs: [{ sourceKey: 'cf1', sourceType: 'computed_field', useValue: 'percentage' }, { sourceKey: 'sg2', sourceType: 'score_group', useValue: 'percentage' }] } }
      ]
    };
    const strategy = new ConfigDrivenScoringStrategy(config as any);
    const res = strategy.score({
      responses: [{ itemId: 'i1', responseValue: 5 }, { itemId: 'i2', responseValue: 5 }, { itemId: 'i3', responseValue: 5 }, { itemId: 'i4', responseValue: 5 }, { itemId: 'i5', responseValue: 3 }]
    } as any);
    // sg1=100, sg2=50. cf1 = 50. cf2 = 50/50 = 1.
    expect(res.computedFields?.find(f => f.key === 'cf2')?.numericValue).toBe(1);
  });

  it('1.23 Full pipeline NEW config: 66 responses → valid ScoredProfilePayload with scoreGroups + computedFields', () => {
    // Generate responses
    const responses = Array(66).fill(0).map((_, i) => ({ itemId: `item-${i+1}`, responseValue: 3 }));
    const config = {
      ...NEW_CONFIG,
      itemRules: responses.map(r => ({ itemId: r.itemId, domain: 'safety' as const, scoreGroup: 'sg1' }))
    };
    const strategy = new ConfigDrivenScoringStrategy(config as any);
    const res = strategy.score({ responses } as any);
    expect(res.scoreGroups).toBeDefined();
    expect(res.computedFields).toBeDefined();
    expect(res.domains).toHaveLength(3);
  });

  it('1.24 Full pipeline OLD config: 66 responses → valid ScoredProfilePayload with domains/dimensions/alignments', () => {
    const strategy = new ConfigDrivenScoringStrategy(MOCK_SCORING_CONFIG as any);
    const responses = Array(66).fill(0).map((_, i) => ({ itemId: `item-${i+1}`, responseValue: 3 }));
    const res = strategy.score({ responses } as any);
    expect(res.domains).toHaveLength(3);
    expect(res.dimensions).toHaveLength(6);
    expect(res.alignments).toHaveLength(3);
  });

  it('1.25 All band values in valid set', () => {
    const strategy = new ConfigDrivenScoringStrategy(NEW_CONFIG as any);
    const res = strategy.score({ responses: [{ itemId: 'i1', responseValue: 4 }] } as any);
    const validBands = ['very_low', 'low', 'almost_balanced', 'balanced', 'high_excessive'];
    res.domains.forEach(d => {
      expect(validBands).toContain(d.band);
    });
  });

  it('1.26 Determinism: same inputs → identical outputs (score twice, deep-equal)', () => {
    const strategy = new ConfigDrivenScoringStrategy(NEW_CONFIG as any);
    const data = { responses: [{ itemId: 'i1', responseValue: 4 }] } as any;
    const p1 = strategy.score(data);
    const p2 = strategy.score(data);
    expect(p1).toEqual(p2);
  });

  it('1.27 Consistency: varied responses → high score', () => {
    const strategy = new ConfigDrivenScoringStrategy(NEW_CONFIG as any);
    const responses = Array(10).fill(0).map((_, i) => ({ itemId: `i${i+1}`, responseValue: (i % 5) + 1, domainTag: 'safety' }));
    const res = strategy.validateConsistency({ responses } as any);
    expect(res.score).toBeGreaterThan(50);
  });

  it('1.28 Consistency: straight line → low score', () => {
    const config = { ...NEW_CONFIG, consistency: { enabled: true, method: 'straight_line_detection' as const, threshold: 70, maxConsecutiveIdentical: 5 } };
    const strategy = new ConfigDrivenScoringStrategy(config as any);
    const responses = Array(20).fill(0).map((_, i) => ({ itemId: `i${i+1}`, responseValue: 3 }));
    const res = strategy.validateConsistency({ responses } as any);
    expect(res.isConsistent).toBe(false);
  });

  it('1.29 Strategy registry: registered key retrievable', () => {
    const mockStrat = { key: 'reg-test', version: 1, score: vi.fn(), validateConsistency: vi.fn() };
    scoringStrategyRegistry.register(mockStrat as any);
    expect(scoringStrategyRegistry.get('reg-test')).toBe(mockStrat);
  });

  it('1.30 Strategy registry: unregistered key throws', () => {
    expect(() => scoringStrategyRegistry.get('non-existent')).toThrow();
  });

  it('1.31 Lazy-load from DB config works', () => {
    const config = { ...NEW_CONFIG, instrumentSlug: 'lazy-slug', version: 2 };
    const key = 'lazy-slug-v2';
    expect(scoringStrategyRegistry.has(key)).toBe(false);
    
    // Simulate what ScoringService does
    registerScoringConfigFromDb(config);
    
    expect(scoringStrategyRegistry.has(key)).toBe(true);
    expect(scoringStrategyRegistry.get(key).key).toBe(key);
  });
});
