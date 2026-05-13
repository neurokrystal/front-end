import { type DrizzleDb } from '@/infrastructure/database/connection';
import { CommercialRepository, type ICommercialRepository } from './commercial.repository';
import { CommercialService, type ICommercialService } from './commercial.service';
import type { IBillingService } from '../billing/billing.service';
import type { IAuditService } from '../audit/audit.service';

export * from './commercial.service';
export * from './commercial.repository';
export * from './commercial.schema';

export function createCommercialServices(
  db: DrizzleDb,
  billingService: IBillingService,
  auditService: IAuditService
): {
  commercialService: ICommercialService;
  commercialRepository: ICommercialRepository;
} {
  const commercialRepository = new CommercialRepository(db);
  const commercialService = new CommercialService(commercialRepository, billingService, auditService);
  return { commercialService, commercialRepository };
}
