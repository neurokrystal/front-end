import { type DrizzleDb } from '@/infrastructure/database/connection';
import { AdminService, type IAdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { BulkOperationRepository } from './bulk-operation.repository';
import { type IBillingService } from '../billing/billing.service';
import { type IScoringRepository } from '../scoring/scoring.repository';
import { type IAuditService } from '../audit/audit.service';

export function createAdminServices(
  db: DrizzleDb,
  billingService: IBillingService,
  scoringRepository: IScoringRepository,
  auditService: IAuditService
): {
  adminService: IAdminService;
} {
  const adminRepository = new AdminRepository(db);
  const bulkOperationRepository = new BulkOperationRepository(db);
  const adminService = new AdminService(adminRepository, bulkOperationRepository, billingService, scoringRepository, auditService);
  return { adminService };
}
