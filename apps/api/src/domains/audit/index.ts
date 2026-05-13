import { type DrizzleDb } from '@/infrastructure/database/connection';
import { AuditRepository } from './audit.repository';
import { AuditService, type IAuditService } from './audit.service';

export function createAuditServices(db: DrizzleDb): {
  auditService: IAuditService;
} {
  const auditRepository = new AuditRepository(db);
  const auditService = new AuditService(auditRepository);
  return { auditService };
}
