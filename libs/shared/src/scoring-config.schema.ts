import { z } from 'zod';

// --- Band Thresholds ---
// Maps a raw score range to a named band
const BandThresholdSchema = z.object({
  band: z.enum([
    'very_low', 'low', 'slightly_low', 'balanced',
    'slightly_excessive', 'excessive', 'extremely_excessive',
  ]),
  min: z.number(),       // Inclusive lower bound
  max: z.number(),       // Exclusive upper bound (except for the last band)
});

// --- Item Scoring Rule ---
// How a single item's response contributes to scoring
const ItemScoringRuleSchema = z.object({
  itemId: z.string(),
  domain: z.enum(['safety', 'challenge', 'play']),
  dimension: z.enum(['self', 'others', 'past', 'future', 'senses', 'perception']).optional(),
  category: z.string().optional(),   // From ITEM_CATEGORIES — but allow custom strings for flexibility
  scoreGroup: z.string().optional(), // Which score group this item contributes to
  weight: z.number().default(1),
  reverseScored: z.boolean().default(false),
  maxResponseValue: z.number().default(5),
  // Backward compatibility:
  state: z.enum(['felt', 'expressed']).optional(),
});

const ScoreGroupSchema = z.object({
  key: z.string(),                    // Unique identifier (e.g., 'safety_feelings', 'challenge_beliefs')
  label: z.string(),                  // Human-readable name
  domain: z.enum(['safety', 'challenge', 'play']),
  category: z.string(),              // Which item category this group aggregates
  dimension: z.string().optional(),   // If dimension-specific
  aggregation: z.enum(['sum', 'mean', 'weighted_mean']).default('sum'),
  // The raw score range for this group
  rawScoreRange: z.object({
    min: z.number(),                  // Minimum possible (e.g., 4 if 4 items scored 1-5)
    max: z.number(),                  // Maximum possible (e.g., 20 if 4 items scored 1-5)
  }),
  // Normalisation: convert raw score to percentage
  normalise: z.boolean().default(true),
  // If normalise is true: percentage = (rawScore - min) / (max - min) * 100
  // Future: norm curve mapping
  normCurve: z.object({
    enabled: z.boolean().default(false),
    curveType: z.enum(['normal', 'custom']).optional(),
    mean: z.number().optional(),
    stdDev: z.number().optional(),
    lookupTable: z.array(z.object({ raw: z.number(), normed: z.number() })).optional(),
  }).optional(),
});

const ComputedFieldSchema = z.object({
  key: z.string(),                    // Unique identifier (e.g., 'safety_alignment', 'challenge_attunement')
  label: z.string(),                  // Human-readable name
  domain: z.enum(['safety', 'challenge', 'play']).optional(),
  formula: z.object({
    type: z.enum([
      'difference',          // A - B
      'absolute_difference', // |A - B|
      'ratio',               // A / B
      'average',             // mean(A, B, C, ...)
      'weighted_sum',        // w1*A + w2*B + ...
      'min',                 // min(A, B, ...)
      'max',                 // max(A, B, ...)
      'custom_expression',   // A safe math expression
    ]),
    inputs: z.array(z.object({
      sourceKey: z.string(),         // Score group key OR another computed field key
      sourceType: z.enum(['score_group', 'computed_field']).default('score_group'),
      useValue: z.enum(['raw', 'percentage', 'band']).default('percentage'),
      weight: z.number().optional(),  // For weighted_sum
    })),
    // For custom_expression: a safe math expression using $0, $1, $2 as input references
    // Example: "($0 - $1) / ($0 + $1) * 100"
    expression: z.string().optional(),
  }),
  outputType: z.enum(['numeric', 'percentage', 'band', 'direction']).default('numeric'),
  bandThresholds: z.array(z.object({
    band: z.string(),
    min: z.number(),
    max: z.number(),
  })).optional(),
  directionLogic: z.object({
    positiveLabel: z.string(),    // e.g., 'masking_upward'
    negativeLabel: z.string(),    // e.g., 'masking_downward'
    neutralLabel: z.string(),     // e.g., 'aligned'
    neutralThreshold: z.number(), // Below this absolute value = neutral
  }).optional(),
});

// --- Dimension Scoring Config ---
const DimensionScoringConfigSchema = z.object({
  dimension: z.enum(['self', 'others', 'past', 'future', 'senses', 'perception']),
  domain: z.enum(['safety', 'challenge', 'play']),
  aggregation: z.enum(['mean', 'sum', 'weighted_mean']).default('mean'),
  bandThresholds: z.array(BandThresholdSchema).min(1),
});

// --- Domain Scoring Config ---
const DomainScoringConfigSchema = z.object({
  domain: z.enum(['safety', 'challenge', 'play']),
  aggregation: z.enum(['mean', 'sum', 'weighted_mean']).default('mean'),
  bandThresholds: z.array(BandThresholdSchema).min(1),
  // Felt/Expressed are scored from their respective item subsets
  feltAggregation: z.enum(['mean', 'sum', 'weighted_mean']).default('mean'),
  expressedAggregation: z.enum(['mean', 'sum', 'weighted_mean']).default('mean'),
});

// --- Alignment Config ---
const AlignmentConfigSchema = z.object({
  // How to compute alignment between felt and expressed scores
  gapMethod: z.enum(['absolute_difference', 'ratio', 'z_score']).default('absolute_difference'),
  // Thresholds for severity classification
  severityThresholds: z.object({
    aligned: z.number(),                // Gap below this = aligned
    mildDivergence: z.number(),         // Gap below this = mild
    significantDivergence: z.number(),   // Gap below this = significant
    // Above significantDivergence = severe
  }),
  // Direction: masking_upward = expressed > felt; masking_downward = felt > expressed
  directionLogic: z.enum(['expressed_minus_felt', 'felt_minus_expressed']).default('expressed_minus_felt'),
});

// --- Consistency Check Config ---
const ConsistencyConfigSchema = z.object({
  enabled: z.boolean().default(true),
  method: z.enum(['intra_domain_variance', 'response_time_outliers', 'straight_line_detection']).default('intra_domain_variance'),
  threshold: z.number().default(70),          // Score below this = flagged
  // For variance method: max acceptable std deviation within a domain's items
  maxIntraDomainStdDev: z.number().optional(),
  // For straight-line detection: max consecutive identical responses
  maxConsecutiveIdentical: z.number().optional(),
});

// --- Root Scoring Configuration ---
export const ScoringConfigSchema = z.object({
  version: z.number().int().min(1),
  instrumentSlug: z.string(),
  responseScale: z.object({
    min: z.number().default(1),
    max: z.number().default(5),
    type: z.enum(['likert', 'binary', 'continuous']).default('likert'),
  }),
  itemRules: z.array(ItemScoringRuleSchema),
  
  // NEW: score groups and computed fields
  scoreGroups: z.array(ScoreGroupSchema).optional(),
  computedFields: z.array(ComputedFieldSchema).optional(),
  
  // Domain-level band thresholds (applied to normalised percentages, 0-100 scale)
  domainBandThresholds: z.array(z.object({
    domain: z.enum(['safety', 'challenge', 'play']),
    bandThresholds: z.array(z.object({
      band: z.enum([
        'very_low', 'low', 'slightly_low', 'balanced',
        'slightly_excessive', 'excessive', 'extremely_excessive',
      ]),
      min: z.number(),
      max: z.number(),
    })),
  })).optional(),
  
  // OLD-FORMAT FIELDS (kept for backward compatibility):
  dimensions: z.array(DimensionScoringConfigSchema).optional(),
  domains: z.array(DomainScoringConfigSchema).optional(),
  alignment: AlignmentConfigSchema.optional(),
  
  consistency: z.object({
    enabled: z.boolean().default(true),
    method: z.enum(['intra_domain_variance', 'response_time_outliers', 'straight_line_detection']).default('intra_domain_variance'),
    threshold: z.number().default(70),
    maxIntraDomainStdDev: z.number().optional(),
    maxConsecutiveIdentical: z.number().optional(),
  }).optional(),
}).refine(data => {
  const hasNew = !!(data.scoreGroups && data.scoreGroups.length > 0);
  const hasOld = !!(data.dimensions && data.dimensions.length > 0);
  return hasNew || hasOld;
}, {
  message: "Scoring config must have either scoreGroups (new format) or dimensions (old format)"
});

export type ScoringConfig = z.infer<typeof ScoringConfigSchema>;
export type ItemScoringRule = z.infer<typeof ItemScoringRuleSchema>;
export type BandThreshold = z.infer<typeof BandThresholdSchema>;
