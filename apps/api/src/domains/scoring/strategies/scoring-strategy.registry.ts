import type { IScoringStrategy } from './scoring-strategy.interface';

class ScoringStrategyRegistry {
  private strategies = new Map<string, IScoringStrategy>();

  register(strategy: IScoringStrategy): void {
    if (this.strategies.has(strategy.key)) {
      throw new Error(`Scoring strategy already registered: ${strategy.key}`);
    }
    this.strategies.set(strategy.key, strategy);
  }

  get(key: string): IScoringStrategy {
    const strategy = this.strategies.get(key);
    if (!strategy) {
      throw new Error(`No scoring strategy registered for key: ${key}. Available: ${[...this.strategies.keys()].join(', ')}`);
    }
    return strategy;
  }

  has(key: string): boolean {
    return this.strategies.has(key);
  }

  clear(): void {
    this.strategies.clear();
  }
}

// Singleton — strategies register at module load time
export const scoringStrategyRegistry = new ScoringStrategyRegistry();
