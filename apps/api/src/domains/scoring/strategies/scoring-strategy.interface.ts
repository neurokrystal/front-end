import type { ScoredProfilePayload } from '../scoring.types';

export interface InstrumentRunData {
  userId: string;
  runId: string;
  instrumentVersionId: string;
  responses: Array<{
    itemId: string;
    responseValue: number | null;
    domainTag: string | null;
    dimensionTag: string | null;
    stateTag: string | null;
    categoryTag?: string | null;
    scoreGroupTag?: string | null;
    configJson: Record<string, unknown> | null;
  }>;
}

export interface IScoringStrategy {
  readonly key: string;           // Unique identifier, matches instrumentVersions.scoringStrategyKey
  readonly version: number;       // Strategy version for profile versioning
  score(runData: InstrumentRunData): ScoredProfilePayload;
  validateConsistency(runData: InstrumentRunData): { isConsistent: boolean; score: number };
}
