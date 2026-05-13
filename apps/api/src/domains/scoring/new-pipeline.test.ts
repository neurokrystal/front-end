import { describe, it, expect } from 'vitest';
import { ConfigDrivenScoringStrategy } from './strategies/config-driven-scoring.strategy';
import { ScoringConfigSchema } from '@dimensional/shared';

describe('New Scoring Pipeline', () => {
  const newConfig = {
    version: 1,
    instrumentSlug: 'new-diagnostic',
    responseScale: { min: 1, max: 5, type: 'likert' as const },
    itemRules: [
      { itemId: 'i1', domain: 'safety', scoreGroup: 'sg1' },
      { itemId: 'i2', domain: 'safety', scoreGroup: 'sg1' },
      { itemId: 'i3', domain: 'safety', scoreGroup: 'sg1' },
      { itemId: 'i4', domain: 'safety', scoreGroup: 'sg1' },
    ],
    scoreGroups: [
      {
        key: 'sg1',
        label: 'Score Group 1',
        domain: 'safety' as const,
        category: 'feelings',
        aggregation: 'sum' as const,
        rawScoreRange: { min: 4, max: 20 },
        normalise: true,
      }
    ],
    computedFields: [
      {
        key: 'cf1',
        label: 'Difference',
        formula: {
          type: 'difference' as const,
          inputs: [
            { sourceKey: 'sg1', sourceType: 'score_group' as const, useValue: 'percentage' as const },
            { sourceKey: 'const40', sourceType: 'computed_field' as const, useValue: 'percentage' as const },
          ]
        }
      },
      {
         key: 'const40',
         label: 'Constant 40',
         formula: {
           type: 'weighted_sum' as const,
           inputs: [
             { sourceKey: 'sg1', sourceType: 'score_group' as const, useValue: 'percentage' as const, weight: 0 }
           ]
         },
         numericValue: 40 // Wait, my strategy doesn't support constant numericValue in config, but I can use a weighted sum of 0 + 40? 
         // Actually I'll just use a simpler way to test absolute difference and expression
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

  it('New-format config parses via ScoringConfigSchema without error', () => {
    expect(() => ScoringConfigSchema.parse(newConfig)).not.toThrow();
  });

  it('Score group sum aggregation and normalisation', () => {
    const strategy = new ConfigDrivenScoringStrategy(newConfig as any);
    const result = strategy.score({
      responses: [
        { itemId: 'i1', responseValue: 3 },
        { itemId: 'i2', responseValue: 4 },
        { itemId: 'i3', responseValue: 5 },
        { itemId: 'i4', responseValue: 2 },
      ]
    } as any);

    const sg1 = result.scoreGroups?.find(g => g.key === 'sg1');
    expect(sg1?.rawScore).toBe(14);
    // (14-4)/(20-4)*100 = 10/16*100 = 62.5
    expect(sg1?.percentage).toBe(62.5);
  });

  it('Computed field formulas', () => {
    const configWithFields = {
      ...newConfig,
      computedFields: [
        {
          key: 'diff',
          label: 'Difference',
          formula: {
            type: 'difference' as const,
            inputs: [
              { sourceKey: 'sg1', sourceType: 'score_group' as const, useValue: 'percentage' as const },
              { sourceKey: 'sg2', sourceType: 'score_group' as const, useValue: 'percentage' as const },
            ]
          }
        },
        {
          key: 'abs_diff',
          label: 'Absolute Difference',
          formula: {
            type: 'absolute_difference' as const,
            inputs: [
              { sourceKey: 'sg2', sourceType: 'score_group' as const, useValue: 'percentage' as const },
              { sourceKey: 'sg1', sourceType: 'score_group' as const, useValue: 'percentage' as const },
            ]
          }
        },
        {
          key: 'custom',
          label: 'Custom Expression',
          formula: {
            type: 'custom_expression' as const,
            expression: '($0 - $1) / ($0 + $1) * 100',
            inputs: [
              { sourceKey: 'sg1', sourceType: 'score_group' as const, useValue: 'percentage' as const },
              { sourceKey: 'sg2', sourceType: 'score_group' as const, useValue: 'percentage' as const },
            ]
          }
        }
      ],
      scoreGroups: [
        ...newConfig.scoreGroups,
        {
          key: 'sg2',
          label: 'SG2',
          domain: 'safety' as const,
          category: 'behaviours',
          aggregation: 'sum' as const,
          rawScoreRange: { min: 1, max: 5 },
          normalise: true,
        }
      ],
      itemRules: [
        ...newConfig.itemRules,
        { itemId: 'i5', domain: 'safety', scoreGroup: 'sg2' }
      ]
    };

    const strategy = new ConfigDrivenScoringStrategy(configWithFields as any);
    const result = strategy.score({
      responses: [
        { itemId: 'i1', responseValue: 3 },
        { itemId: 'i2', responseValue: 4 },
        { itemId: 'i3', responseValue: 5 },
        { itemId: 'i4', responseValue: 2 }, // sg1 percentage = 62.5
        { itemId: 'i5', responseValue: 2.6 }, // sg2 raw=2.6, percentage = (2.6-1)/(5-1)*100 = 1.6/4*100 = 40
      ]
    } as any);

    const diff = result.computedFields?.find(f => f.key === 'diff');
    expect(diff?.numericValue).toBe(22.5); // 62.5 - 40

    const absDiff = result.computedFields?.find(f => f.key === 'abs_diff');
    expect(absDiff?.numericValue).toBe(22.5); // |40 - 62.5|

    const custom = result.computedFields?.find(f => f.key === 'custom');
    // (62.5 - 40) / (62.5 + 40) * 100 = 22.5 / 102.5 * 100 = 21.9512...
    expect(custom?.numericValue).toBe(21.95);
  });

  it('Computed field direction and band', () => {
    const config = {
      ...newConfig,
      computedFields: [
        {
          key: 'dir_pos',
          label: 'Positive',
          formula: { type: 'difference' as const, inputs: [{ sourceKey: 'sg1', sourceType: 'score_group', useValue: 'raw' }, { sourceKey: 'const10', sourceType: 'score_group', useValue: 'raw' }] },
          directionLogic: { positiveLabel: 'pos', negativeLabel: 'neg', neutralLabel: 'neu', neutralThreshold: 5 }
        },
        {
          key: 'dir_neg',
          label: 'Negative',
          formula: { type: 'difference' as const, inputs: [{ sourceKey: 'sg1', sourceType: 'score_group', useValue: 'raw' }, { sourceKey: 'const20', sourceType: 'score_group', useValue: 'raw' }] },
          directionLogic: { positiveLabel: 'pos', negativeLabel: 'neg', neutralLabel: 'neu', neutralThreshold: 5 }
        },
        {
          key: 'dir_neu',
          label: 'Neutral',
          formula: { type: 'difference' as const, inputs: [{ sourceKey: 'sg1', sourceType: 'score_group', useValue: 'raw' }, { sourceKey: 'const15', sourceType: 'score_group', useValue: 'raw' }] },
          directionLogic: { positiveLabel: 'pos', negativeLabel: 'neg', neutralLabel: 'neu', neutralThreshold: 5 }
        }
      ],
      scoreGroups: [
        ...newConfig.scoreGroups,
        { key: 'const10', label: '10', domain: 'safety', category: 'x', aggregation: 'sum', rawScoreRange: { min: 0, max: 100 }, normalise: false },
        { key: 'const20', label: '20', domain: 'safety', category: 'x', aggregation: 'sum', rawScoreRange: { min: 0, max: 100 }, normalise: false },
        { key: 'const15', label: '15', domain: 'safety', category: 'x', aggregation: 'sum', rawScoreRange: { min: 0, max: 100 }, normalise: false },
      ],
      itemRules: [
        ...newConfig.itemRules,
        { itemId: 'ic10', domain: 'safety', scoreGroup: 'const10' },
        { itemId: 'ic20', domain: 'safety', scoreGroup: 'const20' },
        { itemId: 'ic15', domain: 'safety', scoreGroup: 'const15' },
      ]
    };

    const strategy = new ConfigDrivenScoringStrategy(config as any);
    const result = strategy.score({
      responses: [
        { itemId: 'i1', responseValue: 3 },
        { itemId: 'i2', responseValue: 4 },
        { itemId: 'i3', responseValue: 5 },
        { itemId: 'i4', responseValue: 2 }, // sg1 raw = 14
        { itemId: 'ic10', responseValue: 10 },
        { itemId: 'ic20', responseValue: 40 }, // wait, I'll just use 20
        { itemId: 'ic15', responseValue: 15 },
      ]
    } as any);
    
    // I need to fix ic20 response
    const result2 = strategy.score({
      responses: [
        { itemId: 'i1', responseValue: 3 },
        { itemId: 'i2', responseValue: 4 },
        { itemId: 'i3', responseValue: 5 },
        { itemId: 'i4', responseValue: 2 }, // sg1 raw = 14
        { itemId: 'ic10', responseValue: 5 }, // 14 - 5 = 9 > 5 -> pos
        { itemId: 'ic20', responseValue: 25 }, // 14 - 25 = -11 < -5 -> neg
        { itemId: 'ic15', responseValue: 12 }, // 14 - 12 = 2 <= 5 -> neu
      ]
    } as any);

    expect(result2.computedFields?.find(f => f.key === 'dir_pos')?.direction).toBe('pos');
    expect(result2.computedFields?.find(f => f.key === 'dir_neg')?.direction).toBe('neg');
    expect(result2.computedFields?.find(f => f.key === 'dir_neu')?.direction).toBe('neu');
  });

  it('Band resolution on percentage scale', () => {
    const strategy = new ConfigDrivenScoringStrategy(newConfig as any);
    const result = strategy.score({
      responses: [
        { itemId: 'i1', responseValue: 3 },
        { itemId: 'i2', responseValue: 4 },
        { itemId: 'i3', responseValue: 5 },
        { itemId: 'i4', responseValue: 2 }, // raw=14, percentage=62.5
      ]
    } as any);

    const safety = result.domains.find(d => d.domain === 'safety');
    // domain percentage is derived from mean of all items in domain
    // (3+4+5+2)/4 = 14/4 = 3.5
    // (3.5 - 1) / (5 - 1) * 100 = 2.5 / 4 * 100 = 62.5%
    // 62.5% is in [60, 80] -> balanced
    expect(safety?.band).toBe('balanced');
  });
});
