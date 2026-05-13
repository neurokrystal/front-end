// domains/scoring/strategies/scoring-strategy.factory.ts
import { ConfigDrivenScoringStrategy } from './config-driven-scoring.strategy';
import { scoringStrategyRegistry } from './scoring-strategy.registry';
import type { ScoringConfig } from '@dimensional/shared';

export function registerScoringConfigFromDb(config: ScoringConfig): void {
  const strategy = new ConfigDrivenScoringStrategy(config);
  // Only register if not already present (idempotent)
  if (!scoringStrategyRegistry.has(strategy.key)) {
    scoringStrategyRegistry.register(strategy);
  }
}
