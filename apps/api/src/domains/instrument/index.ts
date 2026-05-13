import { type DrizzleDb } from '@/infrastructure/database/connection';
import { InstrumentRepository } from './instrument.repository';
import { InstrumentService } from './instrument.service';
import type { IInstrumentService } from './instrument.service';
import { RunRepository, type IRunRepository } from './features/run/run.repository';
import { RunService } from './features/run/run.service';
import type { IRunService } from './features/run/run.service';
import { type IBillingService } from '../billing/billing.service';
import { type IAuditService } from '../audit/audit.service';
import { type INotificationService } from '../notification/notification.types';

export function createInstrumentServices(
  db: DrizzleDb, 
  billingService: IBillingService,
  auditService: IAuditService,
  notificationService?: INotificationService
): {
  instrumentService: IInstrumentService;
  runService: IRunService;
  runRepository: IRunRepository;
  instrumentRepository: InstrumentRepository;
} {
  const instrumentRepository = new InstrumentRepository(db);
  const instrumentService = new InstrumentService(instrumentRepository);
  
  const runRepository = new RunRepository(db);
  const runService = new RunService(runRepository, instrumentService, billingService, auditService, notificationService);
  
  return { instrumentService, runService, runRepository, instrumentRepository };
}
