// domains/scoring/strategies/config-driven-scoring.strategy.ts
import type { IScoringStrategy, InstrumentRunData } from './scoring-strategy.interface';
import type { ScoredProfilePayload, DomainScore, DimensionScore, AlignmentMetric } from '../scoring.types';
import { ScoringConfigSchema, type ScoringConfig, type ItemScoringRule, type BandThreshold, SCORE_BANDS, DOMAINS, DIMENSIONS, DIMENSION_TO_DOMAIN, ALIGNMENT_SEVERITIES } from '@dimensional/shared';
import { scoringStrategyRegistry } from './scoring-strategy.registry';
import { evaluate } from 'mathjs';

export class ConfigDrivenScoringStrategy implements IScoringStrategy {
  readonly key: string;
  readonly version: number;
  private config: ScoringConfig;

  constructor(config: ScoringConfig) {
    // Validate config at construction time — fail fast
    this.config = ScoringConfigSchema.parse(config);
    this.key = `${config.instrumentSlug}-v${config.version}`;
    this.version = config.version;
  }

  score(runData: InstrumentRunData): ScoredProfilePayload {
    if (this.config.scoreGroups && this.config.scoreGroups.length > 0) {
      return this.scoreNewPipeline(runData);
    }
    
    // Legacy pipeline
    const scoredItems = this.applyItemRules(runData);
    const dimensions = this.computeDimensionScores(scoredItems);
    const domains = this.computeDomainScores(scoredItems);
    const alignments = this.computeAlignments(domains);

    return { domains, dimensions, alignments };
  }

  private scoreNewPipeline(runData: InstrumentRunData): ScoredProfilePayload {
    const scoredItems = this.applyItemRules(runData);
    
    // Step 2 & 3 & 4: Score Groups
    const scoreGroupResults = (this.config.scoreGroups || []).map(group => {
      const groupItems = scoredItems.filter(i => i.scoreGroup === group.key);
      const rawScore = this.aggregate(groupItems, group.aggregation);
      
      let percentage: number | undefined;
      if (group.normalise) {
        const { min, max } = group.rawScoreRange;
        percentage = max === min ? 0 : ((rawScore - min) / (max - min)) * 100;
        percentage = Math.max(0, Math.min(100, percentage));
      }

      let normedPercentage = percentage;
      if (group.normCurve?.enabled && percentage !== undefined) {
        // FUTURE: Implement norm curve mapping. For now, pass through.
      }

      return {
        key: group.key,
        label: group.label,
        domain: group.domain,
        category: group.category,
        dimension: group.dimension,
        rawScore: Math.round(rawScore * 100) / 100,
        percentage: percentage !== undefined ? Math.round(percentage * 100) / 100 : undefined,
        normedPercentage: normedPercentage !== undefined ? Math.round(normedPercentage * 100) / 100 : undefined,
      };
    });

    // Step 5: Resolve band for each domain
    const domainScores: DomainScore[] = DOMAINS.map(domain => {
      const domainItems = scoredItems.filter(i => i.domain === domain);
      // To get domain-level percentage, we average the items' contributions relative to scale
      const scaleMin = this.config.responseScale.min;
      const scaleMax = this.config.responseScale.max;
      
      const domainRawScore = this.aggregate(domainItems, 'mean');
      const domainPercentage = ((domainRawScore - scaleMin) / (scaleMax - scaleMin)) * 100;
      
      const bandThresholds = this.config.domainBandThresholds?.find(t => t.domain === domain)?.bandThresholds 
        || this.config.domains?.find(d => d.domain === domain)?.bandThresholds 
        || [];
      
      const band = this.resolveBand(domainPercentage, bandThresholds);

      // Legacy fields mapping
      const feltGroup = scoreGroupResults.find(g => g.domain === domain && g.category === 'feelings');
      const expressedGroup = scoreGroupResults.find(g => g.domain === domain && g.category === 'behaviours');

      return {
        domain,
        band,
        rawScore: Math.round(domainRawScore * 100) / 100,
        feltScore: feltGroup?.percentage ?? 0,
        expressedScore: expressedGroup?.percentage ?? 0,
      };
    });

    // Step 6: Computed Fields
    const computedFieldResults: any[] = [];
    const resolveValue = (key: string, sourceType: 'score_group' | 'computed_field', useValue: 'raw' | 'percentage' | 'band') => {
      if (sourceType === 'score_group') {
        const group = scoreGroupResults.find(g => g.key === key);
        if (!group) return 0;
        if (useValue === 'percentage') return group.percentage ?? 0;
        if (useValue === 'raw') return group.rawScore;
        return 0; // Band not implemented as numeric yet
      } else {
        const field = computedFieldResults.find(f => f.key === key);
        if (!field) return 0;
        return field.numericValue;
      }
    };

    for (const field of (this.config.computedFields || [])) {
      const inputValues = field.formula.inputs.map(input => 
        resolveValue(input.sourceKey, input.sourceType, input.useValue)
      );

      let value = 0;
      switch (field.formula.type) {
        case 'difference':
          value = (inputValues[0] || 0) - (inputValues[1] || 0);
          break;
        case 'absolute_difference':
          value = Math.abs((inputValues[0] || 0) - (inputValues[1] || 0));
          break;
        case 'ratio':
          value = inputValues[1] !== 0 ? (inputValues[0] || 0) / inputValues[1] : 0;
          break;
        case 'average':
          value = inputValues.length > 0 ? inputValues.reduce((a, b) => a + b, 0) / inputValues.length : 0;
          break;
        case 'weighted_sum':
          value = field.formula.inputs.reduce((sum, input, i) => sum + (inputValues[i] || 0) * (input.weight || 1), 0);
          break;
        case 'min':
          value = Math.min(...inputValues);
          break;
        case 'max':
          value = Math.max(...inputValues);
          break;
        case 'custom_expression':
          if (field.formula.expression) {
            value = this.evaluateExpression(field.formula.expression, inputValues);
          }
          break;
      }

      let band: string | undefined;
      if (field.bandThresholds) {
        band = this.resolveBand(value, field.bandThresholds as any);
      }

      let direction: string | undefined;
      if (field.directionLogic) {
        const absVal = Math.abs(value);
        if (absVal <= field.directionLogic.neutralThreshold) {
          direction = field.directionLogic.neutralLabel;
        } else if (value > 0) {
          direction = field.directionLogic.positiveLabel;
        } else {
          direction = field.directionLogic.negativeLabel;
        }
      }

      computedFieldResults.push({
        key: field.key,
        label: field.label,
        domain: field.domain,
        numericValue: Math.round(value * 100) / 100,
        percentage: field.outputType === 'percentage' ? Math.round(value * 100) / 100 : undefined,
        band,
        direction,
      });
    }

    // Step 8: Legacy fields mapping
    const dimensions: DimensionScore[] = DIMENSIONS.map(dimName => {
      const group = scoreGroupResults.find(g => g.dimension === dimName);
      const domain = domainScores.find(d => d.domain === DIMENSION_TO_DOMAIN[dimName as keyof typeof DIMENSION_TO_DOMAIN]);
      
      // If we don't have a specific group, we might need to aggregate items
      let rawScore = group?.rawScore ?? 0;
      let percentage = group?.percentage ?? 0;
      
      if (!group) {
        const dimItems = scoredItems.filter(i => i.dimension === dimName);
        rawScore = this.aggregate(dimItems, 'mean');
        const scaleMin = this.config.responseScale.min;
        const scaleMax = this.config.responseScale.max;
        percentage = ((rawScore - scaleMin) / (scaleMax - scaleMin)) * 100;
      }

      // Band resolution for dimension (legacy used raw score, but new uses 0-100 mostly)
      // For backward compat, we'll check if we have thresholds
      const dimConfig = this.config.dimensions?.find(d => d.dimension === dimName);
      const band = this.resolveBand(dimConfig?.aggregation === 'mean' ? rawScore : percentage, dimConfig?.bandThresholds || []);

      return {
        dimension: dimName as any,
        domain: DIMENSION_TO_DOMAIN[dimName as keyof typeof DIMENSION_TO_DOMAIN],
        band,
        rawScore: Math.round(rawScore * 100) / 100,
      };
    });

    const alignments: AlignmentMetric[] = domainScores.map(domain => {
      // Use existing computeAlignments logic but adapted to the domain scores we just built
      const alignConfig = this.config.alignment || { gapMethod: 'absolute_difference', severityThresholds: { aligned: 5, mildDivergence: 15, significantDivergence: 25 }, directionLogic: 'expressed_minus_felt' };
      
      let gap: number;
      const expressed = domain.expressedScore;
      const felt = domain.feltScore;

      if (alignConfig.gapMethod === 'absolute_difference') {
        gap = Math.abs(expressed - felt);
      } else if (alignConfig.gapMethod === 'ratio') {
        gap = felt !== 0 ? expressed / felt : 0;
      } else {
        gap = Math.abs(expressed - felt);
      }

      let direction: any;
      const diff = alignConfig.directionLogic === 'expressed_minus_felt' ? expressed - felt : felt - expressed;
      if (gap < (alignConfig.severityThresholds?.aligned ?? 5)) {
        direction = 'aligned';
      } else if (diff > 0) {
        direction = 'masking_upward';
      } else {
        direction = 'masking_downward';
      }

      let severity: any;
      if (gap < (alignConfig.severityThresholds?.aligned ?? 5)) {
        severity = 'aligned';
      } else if (gap < (alignConfig.severityThresholds?.mildDivergence ?? 15)) {
        severity = 'mild_divergence';
      } else if (gap < (alignConfig.severityThresholds?.significantDivergence ?? 25)) {
        severity = 'significant_divergence';
      } else {
        severity = 'severe_divergence';
      }

      return {
        domain: domain.domain,
        direction,
        severity,
        gapMagnitude: Math.round(gap * 100) / 100,
      };
    });

    return {
      domains: domainScores as any,
      dimensions,
      alignments,
      scoreGroups: scoreGroupResults,
      computedFields: computedFieldResults,
    };
  }

  private evaluateExpression(expression: string, inputs: number[]): number {
    let resolved = expression;
    inputs.forEach((val, i) => {
      resolved = resolved.replace(new RegExp(`\\$${i}`, 'g'), val.toString());
    });
    try {
      return evaluate(resolved) as number;
    } catch (e) {
      console.error(`Failed to evaluate expression: ${expression}`, e);
      return 0;
    }
  }

  validateConsistency(runData: InstrumentRunData): { isConsistent: boolean; score: number } {
    if (!this.config.consistency?.enabled) {
      return { isConsistent: true, score: 100 };
    }

    const method = this.config.consistency.method;

    switch (method) {
      case 'intra_domain_variance':
        return this.checkIntraDomainVariance(runData);
      case 'straight_line_detection':
        return this.checkStraightLine(runData);
      case 'response_time_outliers':
        // Future: requires response timing data
        return { isConsistent: true, score: 100 };
      default:
        return { isConsistent: true, score: 100 };
    }
  }

  // --- Private Methods ---

  private applyItemRules(runData: InstrumentRunData): ScoredItem[] {
    const ruleMap = new Map<string, ItemScoringRule>();
    for (const rule of this.config.itemRules) {
      ruleMap.set(rule.itemId, rule);
    }

    return runData.responses
      .filter(r => r.responseValue !== null)
      .map(response => {
        // Look up rule by item ID first, then fall back to tags from the item itself
        const rule: ItemScoringRule = ruleMap.get(response.itemId) ?? {
          itemId: response.itemId,
          domain: response.domainTag as (typeof DOMAINS)[number],
          dimension: response.dimensionTag as (typeof DIMENSIONS)[number],
          state: response.stateTag as 'felt' | 'expressed',
          weight: 1,
          reverseScored: (response.configJson as any)?.reverseScored === true,
          maxResponseValue: this.config.responseScale.max,
          category: (response as any).categoryTag,
          scoreGroup: (response as any).scoreGroupTag,
        };

        let value = response.responseValue!;
        if (rule.reverseScored) {
          value = (rule.maxResponseValue + this.config.responseScale.min) - value;
        }

        return {
          itemId: response.itemId,
          domain: rule.domain,
          dimension: rule.dimension,
          state: rule.state,
          category: rule.category,
          scoreGroup: rule.scoreGroup,
          weight: rule.weight,
          scoredValue: value,
        };
      });
  }

  private computeDimensionScores(items: ScoredItem[]): DimensionScore[] {
    return (this.config.dimensions || []).map(dimConfig => {
      const dimItems = items.filter(i => i.dimension === dimConfig.dimension);
      const rawScore = this.aggregate(dimItems, dimConfig.aggregation);
      const band = this.resolveBand(rawScore, dimConfig.bandThresholds);

      return {
        dimension: dimConfig.dimension,
        domain: dimConfig.domain,
        band,
        rawScore: Math.round(rawScore * 100) / 100,
      } as DimensionScore;
    });
  }

  private computeDomainScores(items: ScoredItem[]): DomainScore[] {
    return (this.config.domains || []).map(domConfig => {
      const domainItems = items.filter(i => i.domain === domConfig.domain);
      const feltItems = domainItems.filter(i => i.state === 'felt');
      const expressedItems = domainItems.filter(i => i.state === 'expressed');

      const rawScore = this.aggregate(domainItems, domConfig.aggregation);
      const feltScore = this.aggregate(feltItems, domConfig.feltAggregation);
      const expressedScore = this.aggregate(expressedItems, domConfig.expressedAggregation);
      const band = this.resolveBand(rawScore, domConfig.bandThresholds);

      return {
        domain: domConfig.domain,
        band,
        rawScore: Math.round(rawScore * 100) / 100,
        feltScore: Math.round(feltScore * 100) / 100,
        expressedScore: Math.round(expressedScore * 100) / 100,
      } as DomainScore;
    });
  }

  private computeAlignments(domains: DomainScore[]): AlignmentMetric[] {
    const alignConfig = this.config.alignment;
    if (!alignConfig) return [];

    return domains.map(domain => {
      let gap: number;
      if (alignConfig.gapMethod === 'absolute_difference') {
        gap = Math.abs(domain.expressedScore - domain.feltScore);
      } else if (alignConfig.gapMethod === 'ratio') {
        gap = domain.feltScore !== 0 ? domain.expressedScore / domain.feltScore : 0;
      } else {
        gap = Math.abs(domain.expressedScore - domain.feltScore);
      }

      // Direction
      let direction: 'aligned' | 'masking_upward' | 'masking_downward';
      const diff = alignConfig.directionLogic === 'expressed_minus_felt'
        ? domain.expressedScore - domain.feltScore
        : domain.feltScore - domain.expressedScore;

      if (gap < alignConfig.severityThresholds.aligned) {
        direction = 'aligned';
      } else if (diff > 0) {
        direction = 'masking_upward';
      } else {
        direction = 'masking_downward';
      }

      // Severity
      let severity: 'aligned' | 'mild_divergence' | 'significant_divergence' | 'severe_divergence';
      if (gap < alignConfig.severityThresholds.aligned) {
        severity = 'aligned';
      } else if (gap < alignConfig.severityThresholds.mildDivergence) {
        severity = 'mild_divergence';
      } else if (gap < alignConfig.severityThresholds.significantDivergence) {
        severity = 'significant_divergence';
      } else {
        severity = 'severe_divergence';
      }

      return {
        domain: domain.domain,
        direction,
        severity,
        gapMagnitude: Math.round(gap * 100) / 100,
      };
    });
  }

  private aggregate(items: ScoredItem[], method: string): number {
    if (items.length === 0) return 0;

    switch (method) {
      case 'sum':
        return 0;
      case 'weighted_mean': {
        const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
        if (totalWeight === 0) return 0;
        return items.reduce((sum, i) => sum + i.scoredValue * i.weight, 0) / totalWeight;
      }
      case 'mean':
      default:
        return items.reduce((sum, i) => sum + i.scoredValue, 0) / items.length;
    }
  }

  private resolveBand(score: number, thresholds: BandThreshold[]): (typeof SCORE_BANDS)[number] {
    if (thresholds.length === 0) return 'balanced'; // Fallback

    // Thresholds must be sorted by min ascending
    const sorted = [...thresholds].sort((a, b) => a.min - b.min);
    for (const threshold of sorted) {
      if (score >= threshold.min && score < threshold.max) {
        return threshold.band as any;
      }
    }
    // If score equals or exceeds the last threshold's max, return the last band
    return sorted[sorted.length - 1].band as any;
  }

  private checkIntraDomainVariance(runData: InstrumentRunData): { isConsistent: boolean; score: number } {
    const maxStdDev = this.config.consistency?.maxIntraDomainStdDev ?? 2.0;
    const domains = ['safety', 'challenge', 'play'] as const;
    const stdDevs: number[] = [];

    for (const domain of domains) {
      const values = runData.responses
        .filter(r => r.domainTag === domain && r.responseValue !== null)
        .map(r => r.responseValue!);
      if (values.length > 1) {
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
        stdDevs.push(Math.sqrt(variance));
      }
    }

    if (stdDevs.length === 0) return { isConsistent: true, score: 100 };

    const avgStdDev = stdDevs.reduce((s, v) => s + v, 0) / stdDevs.length;
    // Normalise to 0-100 score: 0 std dev = 100, maxStdDev = threshold boundary
    const score = Math.max(0, Math.min(100, Math.round(100 - (avgStdDev / maxStdDev) * 100)));

    return {
      isConsistent: score >= (this.config.consistency?.threshold ?? 70),
      score,
    };
  }

  private checkStraightLine(runData: InstrumentRunData): { isConsistent: boolean; score: number } {
    const maxConsecutive = this.config.consistency?.maxConsecutiveIdentical ?? 10;
    let maxRun = 1;
    let currentRun = 1;

    const sorted = [...runData.responses]
      .filter(r => r.responseValue !== null)
      .sort((a, b) => a.itemId.localeCompare(b.itemId));

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].responseValue === sorted[i - 1].responseValue) {
        currentRun++;
        maxRun = Math.max(maxRun, currentRun);
      } else {
        currentRun = 1;
      }
    }

    const score = Math.max(0, Math.min(100, Math.round(100 - (maxRun / maxConsecutive) * 100)));
    return {
      isConsistent: score >= (this.config.consistency?.threshold ?? 70),
      score,
    };
  }
}

interface ScoredItem {
  itemId: string;
  domain: string;
  dimension?: string;
  category?: string;
  scoreGroup?: string;
  state?: string;
  weight: number;
  scoredValue: number;
}
