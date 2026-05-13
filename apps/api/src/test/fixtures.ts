export const DEFAULT_BANDS = [
  { min: 1, max: 2, band: 'very_low' as const },
  { min: 2, max: 3, band: 'low' as const },
  { min: 3, max: 4, band: 'almost_balanced' as const },
  { min: 4, max: 5, band: 'balanced' as const },
  { min: 5, max: 6, band: 'high_excessive' as const },
];

export const MOCK_SCORING_CONFIG = {
  instrumentSlug: 'base-diagnostic',
  version: 1,
  responseScale: { min: 1, max: 5, type: 'likert' as const },
  domains: [
    {
      domain: 'safety' as const,
      aggregation: 'mean' as const,
      feltAggregation: 'mean' as const,
      expressedAggregation: 'mean' as const,
      bandThresholds: DEFAULT_BANDS,
    },
    {
      domain: 'challenge' as const,
      aggregation: 'mean' as const,
      feltAggregation: 'mean' as const,
      expressedAggregation: 'mean' as const,
      bandThresholds: DEFAULT_BANDS,
    },
    {
      domain: 'play' as const,
      aggregation: 'mean' as const,
      feltAggregation: 'mean' as const,
      expressedAggregation: 'mean' as const,
      bandThresholds: DEFAULT_BANDS,
    },
  ],
  dimensions: [
    { dimension: 'self' as const, domain: 'safety' as const, aggregation: 'mean' as const, bandThresholds: DEFAULT_BANDS },
    { dimension: 'others' as const, domain: 'safety' as const, aggregation: 'mean' as const, bandThresholds: DEFAULT_BANDS },
    { dimension: 'past' as const, domain: 'challenge' as const, aggregation: 'mean' as const, bandThresholds: DEFAULT_BANDS },
    { dimension: 'future' as const, domain: 'challenge' as const, aggregation: 'mean' as const, bandThresholds: DEFAULT_BANDS },
    { dimension: 'senses' as const, domain: 'play' as const, aggregation: 'mean' as const, bandThresholds: DEFAULT_BANDS },
    { dimension: 'perception' as const, domain: 'play' as const, aggregation: 'mean' as const, bandThresholds: DEFAULT_BANDS },
  ],
  itemRules: [], // Will be populated by helpers
  alignment: {
    gapMethod: 'absolute_difference' as const,
    directionLogic: 'expressed_minus_felt' as const,
    severityThresholds: {
      aligned: 0.5,
      mildDivergence: 1.0,
      significantDivergence: 2.0,
    },
  },
  consistency: {
    enabled: true,
    method: 'intra_domain_variance' as const,
    threshold: 70,
    maxIntraDomainStdDev: 2.0,
  },
};

export function generateResponses(targets: { 
  safety: number; 
  challenge: number; 
  play: number;
  safetyFelt?: number;
  safetyExpressed?: number;
  challengeFelt?: number;
  challengeExpressed?: number;
  playFelt?: number;
  playExpressed?: number;
}): Array<{ itemId: string; value: number; domain: string; dimension: string; state: string }> {
  const responses: any[] = [];
  const domains = ['safety', 'challenge', 'play'];
  const dimensions: Record<string, string[]> = {
    safety: ['self', 'others'],
    challenge: ['past', 'future'],
    play: ['senses', 'perception'],
  };
  const states = ['felt', 'expressed'];

  let itemId = 1;
  for (const domain of domains) {
    const targetBase = targets[domain as keyof typeof targets] as number;
    for (const dimension of dimensions[domain]) {
      for (const state of states) {
        const stateTargetKey = `${domain}${state.charAt(0).toUpperCase()}${state.slice(1)}` as keyof typeof targets;
        const targetValue = targets[stateTargetKey] !== undefined ? targets[stateTargetKey] as number : targetBase;

        for (let i = 0; i < 5; i++) {
           responses.push({
             itemId: `item-${itemId++}`,
             value: targetValue,
             domain,
             dimension,
             state,
           });
        }
      }
    }
  }
  
  // Add 6 more items to reach 66
  for (let i = 0; i < 6; i++) {
    responses.push({
      itemId: `item-${itemId++}`,
      value: 3,
      domain: 'safety',
      dimension: 'self',
      state: 'felt',
    });
  }

  return responses;
}

export const BALANCED_RESPONSES = generateResponses({ safety: 3, challenge: 3, play: 3 });
