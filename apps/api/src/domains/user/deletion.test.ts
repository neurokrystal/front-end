import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser, createTestScoredProfile, createTestOrg, createTestTeam, addTeamMember } from '../../test/helpers';
import { db } from '../../test/setup';
import { sql, eq } from 'drizzle-orm';
import { deletionRequests } from './user.schema';
import { shareGrants } from '../sharing/share-grant.schema';
import { reports } from '../report/report.schema';
import { scoredProfiles } from '../scoring/scoring.schema';
import { instrumentRuns } from '../instrument/features/run/run.schema';
import { auditLogs } from '../audit/audit.schema';

describe('Category 9: GDPR Deletion', () => {
  const container = getTestContainer();
  const { deletionService, shareService } = container;

  beforeEach(async () => {
    await cleanTestData();
  });

  describe('Lifecycle', () => {
    it('9.1 Request deletion → creates record with status "pending"', async () => {
      const u = await createTestUser();
      const req = await deletionService.requestDeletion(u.id);
      expect(req.status).toBe('pending');
      expect(req.scheduledFor).toBeDefined();
    });

    it('9.2 Cancel deletion → status "cancelled"', async () => {
      const u = await createTestUser();
      const req = await deletionService.requestDeletion(u.id);
      await deletionService.cancelDeletion(u.id);
      const [dbReq] = await db.select().from(deletionRequests).where(eq(deletionRequests.id, req.id));
      expect(dbReq.status).toBe('cancelled');
    });
  });

  describe('Pipeline Execution', () => {
    it('9.3 Execute deletion pipeline → deletes all user data', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser();
      const profile = await createTestScoredProfile(u1.id);
      await shareService.grantShare(u1.id, { targetType: 'user', targetUserId: u2.id });
      
      // Create an audit log
      await container.auditService.log({
        actorUserId: u1.id,
        actionType: 'PROFILE_SCORED',
        subjectUserId: u1.id,
      });

      await deletionService.requestDeletion(u1.id);
      await deletionService.executeDeletion(u1.id);
      
      // Check data gone
      const grants = await db.select().from(shareGrants).where(eq(shareGrants.subjectUserId, u1.id));
      expect(grants).toHaveLength(0);
      
      const profiles = await db.select().from(scoredProfiles).where(eq(scoredProfiles.userId, u1.id));
      expect(profiles).toHaveLength(0);
      
      // Check audit logs anonymized
      const logs = await db.select().from(auditLogs).where(eq(auditLogs.actionType, 'PROFILE_SCORED'));
      expect(logs).toHaveLength(1);
      expect(logs[0].actorUserId).not.toBe(u1.id); // Should be hashed or null
      expect(logs[0].actorUserId).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash
    });
  });
});
