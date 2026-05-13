import type { IAuditRepository } from './audit.repository';
import { auditLogs } from './audit.schema';

export const AUDIT_ACTIONS = {
  // Profile access
  PROFILE_VIEWED: 'profile.viewed',
  PROFILE_SCORED: 'profile.scored',
  PROFILE_CORRECTED: 'profile.corrected',

  // Report access
  REPORT_GENERATED: 'report.generated',
  REPORT_VIEWED: 'report.viewed',
  REPORT_DOWNLOADED: 'report.downloaded',

  // Sharing
  SHARE_GRANTED: 'share.granted',
  SHARE_REVOKED: 'share.revoked',
  SHARE_EXPIRED: 'share.expired',
  ACCESS_DENIED: 'access.denied',        // Log when an access evaluation returns denied
  ACCESS_GRANTED: 'access.granted',       // Log when an access evaluation returns allowed (for sensitive resources)

  // Admin
  ADMIN_IMPERSONATE: 'admin.impersonate',
  ADMIN_PROFILE_EDIT: 'admin.profile_edit',
  ADMIN_REPORT_REGENERATE: 'admin.report_regenerate',
  ADMIN_BULK_OPERATION: 'admin.bulk_operation',
  ADMIN_COMP_GRANT: 'admin.comp_grant',
  ADMIN_USER_EXPORT: 'admin.user_export',

  // Billing
  BILLING_PURCHASE_STARTED: 'billing.purchase_started',
  BILLING_PURCHASE_COMPLETED: 'billing.purchase_completed',
  BILLING_PURCHASE_FAILED: 'billing.purchase_failed',
  BILLING_REFUNDED: 'billing.refunded',

  // Instrument
  RUN_STARTED: 'run.started',
  RUN_COMPLETED: 'run.completed',
} as const;

export interface IAuditService {
  log(entry: typeof auditLogs.$inferInsert): Promise<void>;
  getAccessLogForSubject(subjectUserId: string): Promise<typeof auditLogs.$inferSelect[]>;
  getLogs(filters: {
    actorUserId?: string;
    subjectUserId?: string;
    resourceType?: string;
    resourceId?: string;
  }): Promise<typeof auditLogs.$inferSelect[]>;
}

export class AuditService implements IAuditService {
  constructor(private readonly auditRepository: IAuditRepository) {}

  async log(entry: typeof auditLogs.$inferInsert) {
    await this.auditRepository.create(entry);
  }

  async getAccessLogForSubject(subjectUserId: string) {
    return this.auditRepository.findBySubjectId(subjectUserId);
  }

  async getLogs(filters: {
    actorUserId?: string;
    subjectUserId?: string;
    resourceType?: string;
    resourceId?: string;
  }) {
    return this.auditRepository.find(filters);
  }
}
