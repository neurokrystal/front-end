import { type DrizzleDb } from '@/infrastructure/database/connection';
import { ConsentRepository } from './consent.repository';
import { ConsentService, type IConsentService } from './consent.service';
import { type IAuditService } from '../audit/audit.service';
import { ReportRepository } from '../report/report.repository';

export function createConsentServices(db: DrizzleDb, auditService: IAuditService): {
  consentService: IConsentService;
} {
  const consentRepository = new ConsentRepository(db);
  const reportRepository = new ReportRepository(db);
  const consentService = new ConsentService(consentRepository, auditService, reportRepository);
  return { consentService };
}
