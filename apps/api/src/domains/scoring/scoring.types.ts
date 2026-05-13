// domains/scoring/scoring.types.ts
import { z } from 'zod';
import { SCORE_BANDS, DOMAINS, DIMENSIONS, ALIGNMENT_DIRECTIONS, ALIGNMENT_SEVERITIES } from '@dimensional/shared';

// Help TS infer tuple types across package boundary
const SB = SCORE_BANDS as unknown as [typeof SCORE_BANDS[number], ...typeof SCORE_BANDS[number][]];
const DM = DOMAINS as unknown as [typeof DOMAINS[number], ...typeof DOMAINS[number][]];
const DIM = DIMENSIONS as unknown as [typeof DIMENSIONS[number], ...typeof DIMENSIONS[number][]];
const AD = ALIGNMENT_DIRECTIONS as unknown as [typeof ALIGNMENT_DIRECTIONS[number], ...typeof ALIGNMENT_DIRECTIONS[number][]];
const AS = ALIGNMENT_SEVERITIES as unknown as [typeof ALIGNMENT_SEVERITIES[number], ...typeof ALIGNMENT_SEVERITIES[number][]];

export const DomainScoreSchema = z.object({
  domain: z.enum(DM),
  band: z.enum(SB),
  rawScore: z.number(),
  feltScore: z.number(),
  expressedScore: z.number(),
});

export const DimensionScoreSchema = z.object({
  dimension: z.enum(DIM),
  domain: z.enum(DM),
  band: z.enum(SB),
  rawScore: z.number(),
});

export const AlignmentMetricSchema = z.object({
  domain: z.enum(DM),
  direction: z.enum(AD),
  severity: z.enum(AS),
  gapMagnitude: z.number(),
});

export const ScoredProfilePayloadSchema = z.object({
  // Existing fields (keep for backward compatibility):
  domains: z.array(DomainScoreSchema).length(3),
  dimensions: z.array(DimensionScoreSchema).length(6),
  alignments: z.array(AlignmentMetricSchema).length(3),
  
  // NEW: Full score group results
  scoreGroups: z.array(z.object({
    key: z.string(),
    label: z.string(),
    domain: z.string(),
    category: z.string(),
    dimension: z.string().optional(),
    rawScore: z.number(),
    percentage: z.number().optional(),
    normedPercentage: z.number().optional(),
    band: z.string().optional(),
  })).optional(),
  
  // NEW: Computed field results
  computedFields: z.array(z.object({
    key: z.string(),
    label: z.string(),
    domain: z.string().optional(),
    numericValue: z.number(),
    percentage: z.number().optional(),
    band: z.string().optional(),
    direction: z.string().optional(),
  })).optional(),
});

export type ScoredProfilePayload = z.infer<typeof ScoredProfilePayloadSchema>;
export type DomainScore = z.infer<typeof DomainScoreSchema>;
export type DimensionScore = z.infer<typeof DimensionScoreSchema>;
export type AlignmentMetric = z.infer<typeof AlignmentMetricSchema>;

export const ScoredProfileOutput = z.object({
  id: z.string(),
  userId: z.string(),
  instrumentRunId: z.string(),
  scoringStrategyKey: z.string(),
  scoringStrategyVersion: z.number(),
  safetyBand: z.string(),
  challengeBand: z.string(),
  playBand: z.string(),
  profilePayload: ScoredProfilePayloadSchema,
  createdAt: z.date(),
});

export type ScoredProfileOutput = z.infer<typeof ScoredProfileOutput>;
