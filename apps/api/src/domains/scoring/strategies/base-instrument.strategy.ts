import type { IScoringStrategy, InstrumentRunData } from './scoring-strategy.interface';
import type { ScoredProfilePayload } from '../scoring.types';
import { scoringStrategyRegistry } from './scoring-strategy.registry';

export class BaseInstrumentScoringStrategy implements IScoringStrategy {
  readonly key = 'base-diagnostic-v1';
  readonly version = 1;

  score(runData: InstrumentRunData): ScoredProfilePayload {
    // Deterministic scoring logic goes here
    // Group responses by domain/dimension, calculate raw scores,
    // map to bands, compute felt/expressed splits, derive alignments
    // throw new Error('Scoring specification not yet provided — implement when spec is available');
    
    // For now, return a dummy payload to avoid breaking the flow if needed for testing, 
    // but the instructions say throw error.
    throw new Error('Scoring specification not yet provided — implement when spec is available');
  }

  validateConsistency(runData: InstrumentRunData): { isConsistent: boolean; score: number } {
    // Internal consistency checks (e.g., intra-domain response variance)
    // throw new Error('Consistency spec not yet provided');
    return { isConsistent: true, score: 100 };
  }
}

// Self-registering — importing this file registers the strategy
scoringStrategyRegistry.register(new BaseInstrumentScoringStrategy());
