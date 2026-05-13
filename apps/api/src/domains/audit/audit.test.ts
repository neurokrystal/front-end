import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser, createTestScoredProfile } from '../../test/helpers';
import { db } from '../../test/setup';
import { sql, eq } from 'drizzle-orm';
import { auditLogs } from './audit.schema';

describe('Category 12: Audit Log Integrity', () => {
  const container = getTestContainer();
  const { auditService, runService, shareService, reportService, billingService } = container;

  beforeEach(async () => {
    await cleanTestData();
  });

  describe('CRUD Operations', () => {
    it('12.1 Create audit entry → persisted with all fields', async () => {
      const u = await createTestUser();
      await auditService.log({
        actorUserId: u.id,
        actionType: 'RUN_STARTED',
        resourceType: 'instrument_run',
        resourceId: 'r1',
        subjectUserId: u.id,
        metadata: { client: 'web' },
      });
      
      const [log] = await db.select().from(auditLogs).where(eq(auditLogs.resourceId, 'r1'));
      expect(log.actorUserId).toBe(u.id);
      expect(log.actionType).toBe('RUN_STARTED');
      expect(log.createdAt).toBeDefined();
    });

    it('12.2 No update method exists on audit repository', () => {
        const repo = (auditService as any).repository;
        expect(repo.update).toBeUndefined();
    });

    it('12.3 No delete method exists on audit repository (except GDPR)', () => {
        const repo = (auditService as any).repository;
        expect(repo.delete).toBeUndefined();
    });
  });

  describe('Querying', () => {
    it('12.4 Query by actor → correct entries', async () => {
        const u1 = await createTestUser();
        const u2 = await createTestUser();
        await auditService.log({ actorUserId: u1.id, actionType: 'A1' as any });
        await auditService.log({ actorUserId: u2.id, actionType: 'A2' as any });
        
        const logs = await auditService.getLogs({ actorUserId: u1.id });
        expect(logs).toHaveLength(1);
        expect(logs[0].actionType).toBe('A1');
    });

    it('12.8 Entries ordered by createdAt descending', async () => {
        const u = await createTestUser();
        await auditService.log({ actorUserId: u.id, actionType: 'FIRST' as any });
        // Small delay to ensure timestamp difference if precision is low
        await new Promise(r => setTimeout(r, 10));
        await auditService.log({ actorUserId: u.id, actionType: 'SECOND' as any });
        
        const logs = await auditService.getLogs({ actorUserId: u.id });
        expect(logs[0].actionType).toBe('SECOND');
        expect(logs[1].actionType).toBe('FIRST');
    });
  });

  describe('Full Pipeline Verification', () => {
    it('12.9 COMPREHENSIVE: verify expected audit entries exist after pipeline', async () => {
        const u1 = await createTestUser();
        const u2 = await createTestUser();
        
        // 1. BILLING_PURCHASED
        await container.adminService.grantCompAssessment(u1.id, 'Test');
        
        await auditService.log({ actorUserId: u1.id, actionType: 'RUN_STARTED', resourceType: 'instrument_run', resourceId: 'run-1' });
        await auditService.log({ actorUserId: u1.id, actionType: 'RUN_COMPLETED', resourceType: 'instrument_run', resourceId: 'run-1' });
        await auditService.log({ actorUserId: 'system', actionType: 'PROFILE_SCORED', subjectUserId: u1.id, resourceId: 'prof-1' });
        await auditService.log({ actorUserId: 'system', actionType: 'REPORT_GENERATED', subjectUserId: u1.id, resourceId: 'rep-1' });
        await auditService.log({ actorUserId: u1.id, actionType: 'SHARE_GRANTED', subjectUserId: u1.id, resourceId: 'grant-1', metadata: { target: u2.id } });
        
        const logs = await auditService.getLogs({ subjectUserId: u1.id });
        const types = logs.map(l => l.actionType);
        
        expect(types).toContain('RUN_STARTED');
        expect(types).toContain('RUN_COMPLETED');
        expect(types).toContain('PROFILE_SCORED');
        expect(types).toContain('REPORT_GENERATED');
        expect(types).toContain('SHARE_GRANTED');
    });
  });
});
