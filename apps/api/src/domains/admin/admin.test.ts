import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser, createTestScoredProfile } from '../../test/helpers';
import { db } from '../../test/setup';
import { sql, eq } from 'drizzle-orm';
import { purchases } from '../billing/billing.schema';
import { reports } from '../report/report.schema';
import { auditLogs } from '../audit/audit.schema';

describe('Category 11: Admin Features', () => {
  const container = getTestContainer();
  const { adminService, reportService } = container;

  beforeEach(async () => {
    await cleanTestData();
  });

  describe('Stats & Exports', () => {
    it('11.1 Admin dashboard stats → returns counts and revenue', async () => {
      await createTestUser();
      await createTestUser();
      
      const stats = await adminService.getDashboardStats();
      expect(stats.userCount).toBe(2);
      expect(stats.revenueCents).toBe(0);
    });
  });

  describe('Operations', () => {
    it('11.3 Comp grant → creates $0 completed purchase', async () => {
      const user = await createTestUser();
      const purchase = await adminService.grantCompAssessment(user.id, 'Testing comp');
      
      expect(purchase.amountCents).toBe(0);
      expect(purchase.status).toBe('completed');
      
      const hasEntitlement = await container.billingService.hasUnusedAssessmentPurchase(user.id);
      expect(hasEntitlement).toBe(true);
    });

    it('11.4 Report regeneration → new report created', async () => {
      const user = await createTestUser();
      const profile = await createTestScoredProfile(user.id);
      
      // Initial report
      const r1 = await reportService.generateReport({
        reportType: 'base_diagnostic',
        subjectUserId: user.id,
        viewerUserId: user.id,
        scoredProfileId: profile.id,
      });
      
      // Regenerate
      const r2 = await adminService.regenerateReport(r1.id);
      expect(r2.id).not.toBe(r1.id);
      
      const [dbR1] = await db.select().from(reports).where(eq(reports.id, r1.id));
      expect(dbR1.status).toBe('active'); // Old one is still active unless specified otherwise
    });

    it('11.8 Every admin mutation creates an audit log entry with reason', async () => {
        const user = await createTestUser();
        await adminService.grantCompAssessment(user.id, 'For testing');
        
        const logs = await db.select().from(auditLogs).where(eq(auditLogs.actionType, 'BILLING_PURCHASED'));
        expect(logs).toHaveLength(1);
        expect(logs[0].metadata).toMatchObject({ reason: 'For testing' });
    });
  });
});
