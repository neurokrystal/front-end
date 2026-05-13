import { db } from '../connection';
import { instruments, instrumentVersions, instrumentItems } from '../../../domains/instrument/instrument.schema';
import { ScoringConfig } from '@dimensional/shared';

export async function seedInstrument() {
  console.log('Seeding sample instrument...');
  
  const [instrument] = await db.insert(instruments).values({
    slug: 'base-diagnostic',
    name: 'Base Diagnostic',
    description: 'Dimensional Base Diagnostic Assessment',
    status: 'active',
  }).onConflictDoNothing().returning();

  if (!instrument) return;

  const scoringConfig: ScoringConfig = {
    version: 1,
    instrumentSlug: 'base-diagnostic',
    responseScale: { min: 1, max: 5, type: 'likert' },
    itemRules: [],
    scoreGroups: [],
    computedFields: [],
    domainBandThresholds: [
      { domain: 'safety', bandThresholds: percentBands() },
      { domain: 'challenge', bandThresholds: percentBands() },
      { domain: 'play', bandThresholds: percentBands() },
    ],
    dimensions: [
      { dimension: 'self', domain: 'safety', aggregation: 'mean', bandThresholds: defaultBands() as any },
      { dimension: 'others', domain: 'safety', aggregation: 'mean', bandThresholds: defaultBands() as any },
      { dimension: 'past', domain: 'challenge', aggregation: 'mean', bandThresholds: defaultBands() as any },
      { dimension: 'future', domain: 'challenge', aggregation: 'mean', bandThresholds: defaultBands() as any },
      { dimension: 'senses', domain: 'play', aggregation: 'mean', bandThresholds: defaultBands() as any },
      { dimension: 'perception', domain: 'play', aggregation: 'mean', bandThresholds: defaultBands() as any },
    ],
    domains: [
      { domain: 'safety', aggregation: 'mean', feltAggregation: 'mean', expressedAggregation: 'mean', bandThresholds: defaultBands() as any },
      { domain: 'challenge', aggregation: 'mean', feltAggregation: 'mean', expressedAggregation: 'mean', bandThresholds: defaultBands() as any },
      { domain: 'play', aggregation: 'mean', feltAggregation: 'mean', expressedAggregation: 'mean', bandThresholds: defaultBands() as any },
    ],
    alignment: {
      gapMethod: 'absolute_difference',
      severityThresholds: { aligned: 0.3, mildDivergence: 0.7, significantDivergence: 1.2 },
      directionLogic: 'expressed_minus_felt',
    },
    consistency: { enabled: true, method: 'intra_domain_variance', threshold: 70, maxIntraDomainStdDev: 2.0 },
  };

  for (const domain of ['safety', 'challenge', 'play'] as const) {
    scoringConfig.scoreGroups!.push({
      key: `${domain}_feelings`,
      label: `${domain.charAt(0).toUpperCase() + domain.slice(1)} Feelings`,
      domain,
      category: 'feelings',
      aggregation: 'sum',
      rawScoreRange: { min: 12, max: 60 },
      normalise: true,
    });
    scoringConfig.scoreGroups!.push({
      key: `${domain}_behaviours`,
      label: `${domain.charAt(0).toUpperCase() + domain.slice(1)} Behaviours`,
      domain,
      category: 'behaviours',
      aggregation: 'sum',
      rawScoreRange: { min: 10, max: 50 },
      normalise: true,
    });
    scoringConfig.computedFields!.push({
      key: `${domain}_alignment`,
      label: `${domain.charAt(0).toUpperCase() + domain.slice(1)} Alignment`,
      domain,
      formula: {
        type: 'difference',
        inputs: [
          { sourceKey: `${domain}_feelings`, sourceType: 'score_group', useValue: 'percentage' },
          { sourceKey: `${domain}_behaviours`, sourceType: 'score_group', useValue: 'percentage' },
        ],
      },
      outputType: 'numeric',
      directionLogic: {
        positiveLabel: 'masking_upward',
        negativeLabel: 'masking_downward',
        neutralLabel: 'aligned',
        neutralThreshold: 10,
      },
    });
  }

  const [version] = await db.insert(instrumentVersions).values({
    instrumentId: instrument.id,
    versionNumber: 1,
    itemCount: 66,
    scoringStrategyKey: 'base-diagnostic-v1',
    configJson: scoringConfig,
  }).onConflictDoNothing().returning();

  if (!version) return;

  const items = [];
  const domains = ['safety', 'challenge', 'play'] as const;
  const dimensions = {
    safety: ['self', 'others'],
    challenge: ['past', 'future'],
    play: ['senses', 'perception'],
  } as const;

  let itemIdx = 1;
  for (const domain of domains) {
    for (const dimension of dimensions[domain]) {
      for (let i = 1; i <= 11; i++) {
        const state = i <= 6 ? 'felt' : 'expressed';
        const category = i <= 6 ? 'feelings' : 'behaviours';
        const scoreGroup = i <= 6 ? `${domain}_feelings` : `${domain}_behaviours`;
        const itemId = `item-${itemIdx++}`;
        items.push({
          instrumentVersionId: version.id,
          ordinal: itemIdx,
          itemText: `Sample question for ${domain} ${dimension} ${state} ${i}`,
          domainTag: domain,
          dimensionTag: dimension,
          stateTag: state,
          categoryTag: category,
          scoreGroupTag: scoreGroup,
        });
        
        scoringConfig.itemRules.push({
          itemId: itemId,
          domain,
          dimension,
          state,
          category,
          scoreGroup,
          weight: 1,
          reverseScored: false,
          maxResponseValue: 5,
        });
      }
    }
  }

  await db.insert(instrumentItems).values(items).onConflictDoNothing();
  await db.update(instrumentVersions).set({ configJson: scoringConfig }).where(require('drizzle-orm').eq(instrumentVersions.id, version.id));
  
  console.log('Sample instrument seeded.');
}

function percentBands() {
  return [
    { band: 'very_low', min: 0, max: 20 },
    { band: 'low', min: 20, max: 40 },
    { band: 'almost_balanced', min: 40, max: 60 },
    { band: 'balanced', min: 60, max: 80 },
    { band: 'high_excessive', min: 80, max: 101 },
  ];
}

function defaultBands() {
  return [
    { band: 'very_low', min: 1.0, max: 1.8 },
    { band: 'low', min: 1.8, max: 2.6 },
    { band: 'almost_balanced', min: 2.6, max: 3.4 },
    { band: 'balanced', min: 3.4, max: 4.2 },
    { band: 'high_excessive', min: 4.2, max: 5.1 },
  ];
}
