import { type DrizzleDb } from '@/infrastructure/database/connection';
import { ScoringRepository, type IScoringRepository } from './scoring.repository';
import { ScoringService, type IScoringService } from './scoring.service';
import type { IRunRepository } from '../instrument/features/run/run.repository';
import type { IAuditService } from '../audit/audit.service';
import type { IInstrumentRepository } from '../instrument/instrument.repository';

export function createScoringServices(
  db: DrizzleDb, 
  runRepository: IRunRepository, 
  auditService: IAuditService,
  instrumentRepository: IInstrumentRepository
): {
  scoringService: IScoringService;
  scoringRepository: IScoringRepository;
} {
  const scoringRepository = new ScoringRepository(db);
  const scoringService = new ScoringService(scoringRepository, runRepository, auditService, instrumentRepository);
  return { scoringService, scoringRepository };
}
