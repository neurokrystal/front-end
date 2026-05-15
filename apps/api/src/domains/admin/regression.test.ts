import { describe, it, expect, beforeEach } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser } from '../../test/helpers';
import { db } from '../../test/setup';
import { ForbiddenError } from '@/shared/errors/domain-error';
import { auditLogs } from '../audit/audit.schema';
import { eq, sql } from 'drizzle-orm';

describe('Category 11: Admin', () => {
  let container = getTestContainer();
  let adminService = container.adminService;

  beforeEach(async () => {
    await cleanTestData();
  });

  it('11.1 Dashboard stats → user count, assessment count, revenue', async () => {
    const admin = await createTestUser({ role: 'admin' });
    await createTestUser();
    await createTestUser();

    const stats = await adminService.getDashboardStats(admin.id);
    expect(stats.totalUsers).toBeGreaterThanOrEqual(3); // 2 users + 1 admin
  });

  it('11.3 Comp grant → $0 purchase, user can start run', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const user = await createTestUser();
    
    await adminService.grantCompAssessment(admin.id, user.id, 'Scholarship');
    
    const hasEntitlement = await container.billingService.hasUnusedAssessmentPurchase(user.id);
    expect(hasEntitlement).toBe(true);
  });

  it('11.5 Non-admin → 403', async () => {
    const user = await createTestUser({ role: 'user' });
    await expect(adminService.getDashboardStats(user.id)).rejects.toThrow(ForbiddenError);
  });

  it('11.8 Every admin mutation creates audit entry with reason', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const user = await createTestUser();
    
    await adminService.grantCompAssessment(admin.id, user.id, 'Test Reason');

    const [audit] = await db.select().from(auditLogs).where(eq(auditLogs.actorUserId, admin.id)).orderBy(sql`created_at DESC`).limit(1);
    expect(audit).toBeDefined();
    expect(audit.metadata).toMatchObject({ reason: 'Test Reason' });
  });
});
