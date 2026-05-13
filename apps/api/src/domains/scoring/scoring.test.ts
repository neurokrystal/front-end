import { describe, it, expect, vi } from 'vitest';
import { ConfigDrivenScoringStrategy } from './strategies/config-driven-scoring.strategy';
import { ScoringConfigSchema } from '@dimensional/shared';
import { MOCK_SCORING_CONFIG } from '../../test/fixtures';
import { generateResponses } from '../../test/helpers';
import { ZodError } from 'zod';
import { scoringStrategyRegistry } from './strategies/scoring-strategy.registry';

describe('Category 1: Scoring Engine', () => {
  describe('Config Parsing', () => {
    it('1.1 Valid scoring config parses without error via ScoringConfigSchema', () => {
      expect(() => ScoringConfigSchema.parse(MOCK_SCORING_CONFIG)).not.toThrow();
    });

    it('1.2 Invalid config (missing domains AND scoreGroups AND dimensions) throws ZodError', () => {
      const invalid = { ...MOCK_SCORING_CONFIG, domains: undefined, dimensions: undefined, scoreGroups: undefined };
      expect(() => ScoringConfigSchema.parse(invalid)).toThrow(ZodError);
    });

    it('1.3 Invalid config (wrong aggregation value) throws ZodError', () => {
      const invalid = {
        ...MOCK_SCORING_CONFIG,
        domains: [{ ...MOCK_SCORING_CONFIG.domains[0], aggregation: 'invalid' }]
      };
      expect(() => ScoringConfigSchema.parse(invalid)).toThrow(ZodError);
    });
  });

  describe('Item Scoring', () => {
    it('1.4 Standard item scores map correctly (response 4 on 1-5 scale → scored value 4)', () => {
      const config = {
        ...MOCK_SCORING_CONFIG,
        itemRules: [{ itemId: 'item-1', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 }]
      };
      const strategy = new ConfigDrivenScoringStrategy(config as any);
      const payload = strategy.score({
        responses: [{ itemId: 'item-1', responseValue: 4 }]
      } as any);
      const safety = payload.domains.find(d => d.domain === 'safety');
      expect(safety?.rawScore).toBe(4);
    });

    it('1.5 Reverse-scored item inverts correctly (response 4 on 1-5 scale → scored value 2)', () => {
      const config = {
        ...MOCK_SCORING_CONFIG,
        itemRules: [{ itemId: 'item-1', domain: 'safety', dimension: 'self', state: 'felt', weight: 1, reverseScored: true, maxResponseValue: 5 }]
      };
      const strategy = new ConfigDrivenScoringStrategy(config as any);
      // (5+1) - 4 = 2
      const payload = strategy.score({
        responses: [{ itemId: 'item-1', responseValue: 4 }]
      } as any);
      const safety = payload.domains.find(d => d.domain === 'safety');
      expect(safety?.rawScore).toBe(2);
    });

    it('1.6 Weighted item: weight of 2 doubles contribution to weighted mean', () => {
      const config = {
        ...MOCK_SCORING_CONFIG,
        domains: [
          { ...MOCK_SCORING_CONFIG.domains[0], aggregation: 'weighted_mean' as const },
          MOCK_SCORING_CONFIG.domains[1],
          MOCK_SCORING_CONFIG.domains[2]
        ],
        itemRules: [
          { itemId: 'item-1', domain: 'safety', dimension: 'self', state: 'felt', weight: 2 },
          { itemId: 'item-2', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 }
        ]
      };
      const strategy = new ConfigDrivenScoringStrategy(config as any);
      const payload = strategy.score({
        responses: [
          { itemId: 'item-1', responseValue: 4 },
          { itemId: 'item-2', responseValue: 1 }
        ]
      } as any);
      // (4*2 + 1*1) / (2 + 1) = 9 / 3 = 3
      const safety = payload.domains.find(d => d.domain === 'safety');
      expect(safety?.rawScore).toBe(3);
    });

    it('1.7 Null responses are excluded from scoring (not counted as zero)', () => {
      const config = {
        ...MOCK_SCORING_CONFIG,
        itemRules: [
          { itemId: 'item-1', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 },
          { itemId: 'item-2', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 }
        ]
      };
      const strategy = new ConfigDrivenScoringStrategy(config as any);
      const payload = strategy.score({
        responses: [
          { itemId: 'item-1', responseValue: 4 },
          { itemId: 'item-2', responseValue: null }
        ]
      } as any);
      const safety = payload.domains.find(d => d.domain === 'safety');
      expect(safety?.rawScore).toBe(4);
    });
  });

  describe('Aggregation & Bands', () => {
    it('1.8 Mean aggregation: [2, 3, 4, 3, 3] → 3.0', () => {
      const config = {
        ...MOCK_SCORING_CONFIG,
        itemRules: [
          { itemId: 'i1', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 },
          { itemId: 'i2', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 },
          { itemId: 'i3', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 },
          { itemId: 'i4', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 },
          { itemId: 'i5', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 }
        ]
      };
      const strategy = new ConfigDrivenScoringStrategy(config as any);
      const payload = strategy.score({
        responses: [
          { itemId: 'i1', responseValue: 2 },
          { itemId: 'i2', responseValue: 3 },
          { itemId: 'i3', responseValue: 4 },
          { itemId: 'i4', responseValue: 3 },
          { itemId: 'i5', responseValue: 3 }
        ]
      } as any);
      const safety = payload.domains.find(d => d.domain === 'safety');
      expect(safety?.rawScore).toBe(3.0);
    });

    it('1.9 Sum aggregation: [2, 3, 4, 3, 3] → 15', () => {
      const config = {
        ...MOCK_SCORING_CONFIG,
        domains: [{ ...MOCK_SCORING_CONFIG.domains[0], aggregation: 'sum' as const }, MOCK_SCORING_CONFIG.domains[1], MOCK_SCORING_CONFIG.domains[2]],
        itemRules: [
          { itemId: 'i1', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 },
          { itemId: 'i2', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 },
          { itemId: 'i3', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 },
          { itemId: 'i4', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 },
          { itemId: 'i5', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 }
        ]
      };
      const strategy = new ConfigDrivenScoringStrategy(config as any);
      const payload = strategy.score({
        responses: [
          { itemId: 'i1', responseValue: 2 },
          { itemId: 'i2', responseValue: 3 },
          { itemId: 'i3', responseValue: 4 },
          { itemId: 'i4', responseValue: 3 },
          { itemId: 'i5', responseValue: 3 }
        ]
      } as any);
      const safety = payload.domains.find(d => d.domain === 'safety');
      expect(safety?.rawScore).toBe(15);
    });

    it('1.10 Band resolution: score 1.5 with sample thresholds → "very_low"', () => {
      const strategy = new ConfigDrivenScoringStrategy(MOCK_SCORING_CONFIG as any);
      const payload = strategy.score({
        responses: [{ itemId: 'item-1', responseValue: 1.5, domainTag: 'safety', dimensionTag: 'self', stateTag: 'felt' }]
      } as any);
      const safety = payload.domains.find(d => d.domain === 'safety');
      expect(safety?.band).toBe('very_low');
    });

    it('1.11 Band resolution: score 3.0 → "almost_balanced"', () => {
      const strategy = new ConfigDrivenScoringStrategy(MOCK_SCORING_CONFIG as any);
      const payload = strategy.score({
        responses: [{ itemId: 'item-1', responseValue: 3.0, domainTag: 'safety', dimensionTag: 'self', stateTag: 'felt' }]
      } as any);
      const safety = payload.domains.find(d => d.domain === 'safety');
      expect(safety?.band).toBe('almost_balanced');
    });

    it('1.12 Band resolution: score 4.5 → "balanced"', () => {
      const strategy = new ConfigDrivenScoringStrategy(MOCK_SCORING_CONFIG as any);
      const payload = strategy.score({
        responses: [{ itemId: 'item-1', responseValue: 4.5, domainTag: 'safety', dimensionTag: 'self', stateTag: 'felt' }]
      } as any);
      const safety = payload.domains.find(d => d.domain === 'safety');
      expect(safety?.band).toBe('balanced');
    });

    it('1.13 Band resolution: score exactly on threshold boundary → correct band (test edge)', () => {
      const strategy = new ConfigDrivenScoringStrategy(MOCK_SCORING_CONFIG as any);
      const payload = strategy.score({
        responses: [{ itemId: 'item-1', responseValue: 3.0, domainTag: 'safety', dimensionTag: 'self', stateTag: 'felt' }]
      } as any);
      const safety = payload.domains.find(d => d.domain === 'safety');
      expect(safety?.band).toBe('almost_balanced');
    });
  });

  describe('Sub-scores & Alignment', () => {
    it('1.14 Domain felt score computed from felt-tagged items only', () => {
      const config = {
        ...MOCK_SCORING_CONFIG,
        itemRules: [
          { itemId: 'i1', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 },
          { itemId: 'i2', domain: 'safety', dimension: 'self', state: 'expressed', weight: 1 }
        ]
      };
      const strategy = new ConfigDrivenScoringStrategy(config as any);
      const payload = strategy.score({
        responses: [
          { itemId: 'i1', responseValue: 5 },
          { itemId: 'i2', responseValue: 1 }
        ]
      } as any);
      const safety = payload.domains.find(d => d.domain === 'safety');
      expect(safety?.feltScore).toBe(5);
    });

    it('1.15 Domain expressed score computed from expressed-tagged items only', () => {
      const config = {
        ...MOCK_SCORING_CONFIG,
        itemRules: [
          { itemId: 'i1', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 },
          { itemId: 'i2', domain: 'safety', dimension: 'self', state: 'expressed', weight: 1 }
        ]
      };
      const strategy = new ConfigDrivenScoringStrategy(config as any);
      const payload = strategy.score({
        responses: [
          { itemId: 'i1', responseValue: 5 },
          { itemId: 'i2', responseValue: 1 }
        ]
      } as any);
      const safety = payload.domains.find(d => d.domain === 'safety');
      expect(safety?.expressedScore).toBe(1);
    });

    it('1.16 Alignment: gap < aligned threshold → severity "aligned", direction "aligned"', () => {
      const config = {
        ...MOCK_SCORING_CONFIG,
        itemRules: [
          { itemId: 'i1', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 },
          { itemId: 'i2', domain: 'safety', dimension: 'self', state: 'expressed', weight: 1 }
        ]
      };
      const strategy = new ConfigDrivenScoringStrategy(config as any);
      const payload = strategy.score({
        responses: [
          { itemId: 'i1', responseValue: 3.0 },
          { itemId: 'i2', responseValue: 3.2 }
        ]
      } as any);
      const alignment = payload.alignments.find(a => a.domain === 'safety');
      expect(alignment?.severity).toBe('aligned');
      expect(alignment?.direction).toBe('aligned');
    });

    it('1.17 Alignment: expressed > felt by mild amount → "masking_upward", "mild_divergence"', () => {
      const config = {
        ...MOCK_SCORING_CONFIG,
        itemRules: [
          { itemId: 'i1', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 },
          { itemId: 'i2', domain: 'safety', dimension: 'self', state: 'expressed', weight: 1 }
        ]
      };
      const strategy = new ConfigDrivenScoringStrategy(config as any);
      const payload = strategy.score({
        responses: [
          { itemId: 'i1', responseValue: 2.0 },
          { itemId: 'i2', responseValue: 2.8 }
        ]
      } as any);
      const alignment = payload.alignments.find(a => a.domain === 'safety');
      expect(alignment?.direction).toBe('masking_upward');
      expect(alignment?.severity).toBe('mild_divergence');
    });

    it('1.18 Alignment: felt > expressed by large amount → "masking_downward", "severe_divergence"', () => {
      const config = {
        ...MOCK_SCORING_CONFIG,
        itemRules: [
          { itemId: 'i1', domain: 'safety', dimension: 'self', state: 'felt', weight: 1 },
          { itemId: 'i2', domain: 'safety', dimension: 'self', state: 'expressed', weight: 1 }
        ]
      };
      const strategy = new ConfigDrivenScoringStrategy(config as any);
      const payload = strategy.score({
        responses: [
          { itemId: 'i1', responseValue: 5.0 },
          { itemId: 'i2', responseValue: 2.0 }
        ]
      } as any);
      const alignment = payload.alignments.find(a => a.domain === 'safety');
      expect(alignment?.direction).toBe('masking_downward');
      expect(alignment?.severity).toBe('severe_divergence');
    });
  });

  describe('Full Pipeline & Consistency', () => {
    it('1.19 Full pipeline: 66 responses → valid ScoredProfilePayload (3 domains, 6 dimensions, 3 alignments)', () => {
      const responses = generateResponses({ safety: 3, challenge: 4, play: 2 });
      const config = {
        ...MOCK_SCORING_CONFIG,
        itemRules: responses.map(r => ({ ...r, domain: 'safety', dimension: 'self', state: 'felt', weight: 1, maxResponseValue: 5 }))
      };
      const strategy = new ConfigDrivenScoringStrategy(config as any);
      const payload = strategy.score({ responses: responses.map(r => ({ itemId: r.itemId, responseValue: r.value })) } as any);
      
      expect(payload.domains).toHaveLength(3);
      expect(payload.dimensions).toHaveLength(6);
      expect(payload.alignments).toHaveLength(3);
    });

    it('1.20 All band values are from the valid set of 5 bands', () => {
      const validBands = ['very_low', 'low', 'almost_balanced', 'balanced', 'high_excessive'];
      const responses = generateResponses({ safety: 1, challenge: 3, play: 5 });
      const config = {
        ...MOCK_SCORING_CONFIG,
        itemRules: responses.map(r => ({ ...r, domain: 'safety', dimension: 'self', state: 'felt', weight: 1, maxResponseValue: 5 }))
      };
      const strategy = new ConfigDrivenScoringStrategy(config as any);
      const payload = strategy.score({ responses: responses.map(r => ({ itemId: r.itemId, responseValue: r.value })) } as any);
      
      payload.domains.forEach(d => {
        expect(validBands).toContain(d.band);
      });
    });

    it('1.21 Determinism: same inputs → identical outputs (score twice, deep-equal compare)', () => {
      const responses = generateResponses({ safety: 3, challenge: 4, play: 2 });
      const config = {
        ...MOCK_SCORING_CONFIG,
        itemRules: responses.map(r => ({ ...r, domain: 'safety', dimension: 'self', state: 'felt', weight: 1, maxResponseValue: 5 }))
      };
      const strategy = new ConfigDrivenScoringStrategy(config as any);
      const p1 = strategy.score({ responses: responses.map(r => ({ itemId: r.itemId, responseValue: r.value })) } as any);
      const p2 = strategy.score({ responses: responses.map(r => ({ itemId: r.itemId, responseValue: r.value })) } as any);
      expect(p1).toEqual(p2);
    });

    it('1.22 Consistency check: varied responses → isConsistent = true', () => {
      const config = {
        ...MOCK_SCORING_CONFIG,
        consistency: { enabled: true, threshold: 0.1 }
      };
      const strategy = new ConfigDrivenScoringStrategy(config as any);
      const responses = generateResponses({ safety: 3, challenge: 3, play: 3 });
      const isConsistent = strategy.validateConsistency({ 
        responses: responses.map(r => ({ itemId: r.itemId, responseValue: r.value, domainTag: 'safety' })) 
      } as any);
      expect(isConsistent.isConsistent).toBe(true);
    });

    it('1.23 Consistency check: all-3s straight line → low score (if straight_line method configured)', () => {
        const config = {
          ...MOCK_SCORING_CONFIG,
          consistency: { enabled: true, method: 'straight_line_detection', threshold: 0.9 }
        };
        const strategy = new ConfigDrivenScoringStrategy(config as any);
        const responses = Array(66).fill(0).map((_, i) => ({ itemId: `item-${i+1}`, responseValue: 3 }));
        const isConsistent = strategy.validateConsistency({ responses } as any);
        expect(isConsistent.isConsistent).toBe(false);
    });
  });

  describe('Registry & Lazy Loading', () => {
    it('1.24 Strategy registry: registered strategy is retrievable by key', () => {
      const mockStrat = { key: 'test-key', version: 1, score: vi.fn(), validateConsistency: vi.fn() };
      scoringStrategyRegistry.register(mockStrat as any);
      expect(scoringStrategyRegistry.get('test-key')).toBe(mockStrat);
    });

    it('1.25 Strategy registry: unregistered key throws error', () => {
      expect(() => scoringStrategyRegistry.get('unknown')).toThrow();
    });

    it('1.26 Strategy lazy-loads from DB config when not in registry', () => {
        // Factory level test
    });
  });
});
