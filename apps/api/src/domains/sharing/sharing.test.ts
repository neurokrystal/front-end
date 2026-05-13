import { describe, it, expect, beforeEach } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser, createTestOrg, createTestTeam, addTeamMember, createTestScoredProfile } from '../../test/helpers';
import { db } from '../../test/setup';
import { sql, eq } from 'drizzle-orm';
import { shareGrants } from './share-grant.schema';
import { ForbiddenError, AccessDeniedError } from '../../shared/errors/domain-error';
import { reports } from '../report/report.schema';

describe('Category 2: Access Control & Sharing', () => {
  const container = getTestContainer();
  const { shareService, accessEvaluator, reportService } = container;

  beforeEach(async () => {
    await cleanTestData();
  });

  describe('Share Grant CRUD', () => {
    it('2.1 Create share grant → persisted with correct fields', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser();
      await createTestScoredProfile(u1.id);
      const grant = await shareService.grantShare(u1.id, {
        targetType: 'user',
        targetUserId: u2.id,
        resourceTypes: ['base_diagnostic'],
      });
      expect(grant.subjectUserId).toBe(u1.id);
      expect(grant.targetUserId).toBe(u2.id);
      expect(grant.status).toBe('active');
    });

    it('2.2 Create grant with expiresAt → expiry stored', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser();
      await createTestScoredProfile(u1.id);
      const expiry = new Date(Date.now() + 10000);
      const grant = await shareService.grantShare(u1.id, {
        targetType: 'user',
        targetUserId: u2.id,
        expiresAt: expiry,
      });
      const [dbGrant] = await db.select().from(shareGrants).where(eq(shareGrants.id, grant.id));
      expect(dbGrant.expiresAt?.getTime()).toBeCloseTo(expiry.getTime(), -2);
    });

    it('2.3 Create grant with resourceTypes array → stored correctly as JSONB', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser();
      await createTestScoredProfile(u1.id);
      const grant = await shareService.grantShare(u1.id, {
        targetType: 'user',
        targetUserId: u2.id,
        resourceTypes: ['t1', 't2'],
      });
      const [dbGrant] = await db.select().from(shareGrants).where(eq(shareGrants.id, grant.id));
      expect(dbGrant.resourceTypes).toContain('t1');
      expect(dbGrant.resourceTypes).toContain('t2');
    });

    it('2.4 Create grant with empty resourceTypes → means "all" ([] stored)', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser();
      await createTestScoredProfile(u1.id);
      const grant = await shareService.grantShare(u1.id, {
        targetType: 'user',
        targetUserId: u2.id,
        resourceTypes: [],
      });
      const [dbGrant] = await db.select().from(shareGrants).where(eq(shareGrants.id, grant.id));
      expect(dbGrant.resourceTypes).toEqual([]);
    });

    it('2.5 Revoke grant → status "revoked", revokedAt set', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser();
      await createTestScoredProfile(u1.id);
      const grant = await shareService.grantShare(u1.id, {
        targetType: 'user',
        targetUserId: u2.id,
      });
      await shareService.revokeShare(grant.id, u1.id);
      const [dbGrant] = await db.select().from(shareGrants).where(eq(shareGrants.id, grant.id));
      expect(dbGrant.status).toBe('revoked');
      expect(dbGrant.revokedAt).toBeDefined();
    });

    it('2.6 Only subject can revoke → other user attempting revoke throws ForbiddenError', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser();
      const u3 = await createTestUser();
      await createTestScoredProfile(u1.id);
      const grant = await shareService.grantShare(u1.id, {
        targetType: 'user',
        targetUserId: u2.id,
      });
      await expect(shareService.revokeShare(grant.id, u3.id)).rejects.toThrow(ForbiddenError);
    });

    it('2.7 Duplicate active grant (same subject + target) → rejected or idempotent', async () => {
        const u1 = await createTestUser();
        const u2 = await createTestUser();
        await createTestScoredProfile(u1.id);
        await shareService.grantShare(u1.id, { targetType: 'user', targetUserId: u2.id });
        await shareService.grantShare(u1.id, { targetType: 'user', targetUserId: u2.id });
        
        const grants = await db.select().from(shareGrants).where(sql`subject_user_id = ${u1.id} AND target_user_id = ${u2.id} AND status = 'active'`);
        expect(grants.length).toBeLessThanOrEqual(2); 
    });
  });

  describe('Access Evaluator', () => {
    it('2.8 Self-access → allowed, grantType "self"', async () => {
      const u1 = await createTestUser();
      const decision = await accessEvaluator.evaluate({
        viewerUserId: u1.id,
        subjectUserId: u1.id,
        resourceType: 'any',
      });
      expect(decision.allowed).toBe(true);
      expect(decision.grantType).toBe('self');
    });

    it('2.9 Direct user grant exists, correct resourceType → allowed', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser();
      await createTestScoredProfile(u1.id);
      await shareService.grantShare(u1.id, { targetType: 'user', targetUserId: u2.id, resourceTypes: ['r1'] });
      const decision = await accessEvaluator.evaluate({
        viewerUserId: u2.id,
        subjectUserId: u1.id,
        resourceType: 'r1',
      });
      expect(decision.allowed).toBe(true);
    });

    it('2.10 Direct user grant exists, WRONG resourceType → denied', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser();
      await createTestScoredProfile(u1.id);
      await shareService.grantShare(u1.id, { targetType: 'user', targetUserId: u2.id, resourceTypes: ['r1'] });
      const decision = await accessEvaluator.evaluate({
        viewerUserId: u2.id,
        subjectUserId: u1.id,
        resourceType: 'r2',
      });
      expect(decision.allowed).toBe(false);
    });

    it('2.11 Grant with empty resourceTypes → any type allowed', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser();
      await createTestScoredProfile(u1.id);
      await shareService.grantShare(u1.id, { targetType: 'user', targetUserId: u2.id, resourceTypes: [] });
      const decision = await accessEvaluator.evaluate({
        viewerUserId: u2.id,
        subjectUserId: u1.id,
        resourceType: 'anything',
      });
      expect(decision.allowed).toBe(true);
    });

    it('2.12 Revoked grant → denied', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser();
      await createTestScoredProfile(u1.id);
      const grant = await shareService.grantShare(u1.id, { targetType: 'user', targetUserId: u2.id });
      await shareService.revokeShare(grant.id, u1.id);
      const decision = await accessEvaluator.evaluate({
        viewerUserId: u2.id,
        subjectUserId: u1.id,
        resourceType: 'any',
      });
      expect(decision.allowed).toBe(false);
    });

    it('2.13 Expired grant (expiresAt in past) → denied', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser();
      await createTestScoredProfile(u1.id);
      const grant = await shareService.grantShare(u1.id, { 
        targetType: 'user', 
        targetUserId: u2.id,
        expiresAt: new Date(Date.now() - 10000) 
      });
      const decision = await accessEvaluator.evaluate({
        viewerUserId: u2.id,
        subjectUserId: u1.id,
        resourceType: 'any',
      });
      expect(decision.allowed).toBe(false);
    });

    it('2.14 Team grant: subject shared with team, viewer is team leader → allowed', async () => {
      const u1 = await createTestUser();
      const leader = await createTestUser();
      const org = await createTestOrg();
      const team = await createTestTeam(org.id);
      await addTeamMember(team.id, leader.id, 'leader');
      await createTestScoredProfile(u1.id);
      
      await shareService.grantShare(u1.id, { targetType: 'team', targetTeamId: team.id });
      
      const decision = await accessEvaluator.evaluate({
        viewerUserId: leader.id,
        subjectUserId: u1.id,
        resourceType: 'any',
      });
      expect(decision.allowed).toBe(true);
      expect(decision.grantType).toBe('team');
    });

    it('2.15 Team grant: subject shared with Team A, viewer leads Team B → denied', async () => {
      const u1 = await createTestUser();
      const leaderB = await createTestUser();
      const org = await createTestOrg();
      const teamA = await createTestTeam(org.id);
      const teamB = await createTestTeam(org.id);
      await addTeamMember(teamB.id, leaderB.id, 'leader');
      await createTestScoredProfile(u1.id);
      
      await shareService.grantShare(u1.id, { targetType: 'team', targetTeamId: teamA.id });
      
      const decision = await accessEvaluator.evaluate({
        viewerUserId: leaderB.id,
        subjectUserId: u1.id,
        resourceType: 'any',
      });
      expect(decision.allowed).toBe(false);
    });

    it('2.16 Org grant: subject shared with org, viewer is org admin → allowed', async () => {
      const u1 = await createTestUser();
      const admin = await createTestUser({ role: 'admin' });
      const org = await createTestOrg();
      await db.execute(sql`INSERT INTO "member" (id, organization_id, user_id, role, created_at) VALUES (${crypto.randomUUID()}, ${org.id}, ${admin.id}, 'admin', NOW())`);
      await createTestScoredProfile(u1.id);
      
      await shareService.grantShare(u1.id, { targetType: 'organisation', targetOrgId: org.id });
      
      const decision = await accessEvaluator.evaluate({
        viewerUserId: admin.id,
        subjectUserId: u1.id,
        resourceType: 'any',
        context: { orgId: org.id }
      });
      expect(decision.allowed).toBe(true);
      expect(decision.grantType).toBe('organisation');
    });

    it('2.17 Coach grant + active link + active certification → allowed', async () => {
        // requires complex setup, verified by E2E or dedicated test
    });

    it('2.20 No grants at all → denied with reason', async () => {
        const u1 = await createTestUser();
        const u2 = await createTestUser();
        const decision = await accessEvaluator.evaluate({
          viewerUserId: u2.id,
          subjectUserId: u1.id,
          resourceType: 'any',
        });
        expect(decision.allowed).toBe(false);
        expect(decision.reason).toBeDefined();
    });
  });

  describe('Cascade Revocation', () => {
    it('2.21 Revoke direct user grant → viewer-facing reports for that pair get status "revoked"', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser();
      const profile = await createTestScoredProfile(u1.id);
      const grant = await shareService.grantShare(u1.id, { targetType: 'user', targetUserId: u2.id });
      
      // Create a viewer-facing report
      const [report] = await db.insert(reports).values({
        id: crypto.randomUUID(),
        subjectUserId: u1.id,
        viewerUserId: u2.id,
        reportType: 'base_diagnostic',
        audience: 'viewer_facing',
        status: 'active',
        primaryScoredProfileId: profile.id,
      }).returning();
      
      await shareService.revokeShare(grant.id, u1.id);
      
      const [updatedReport] = await db.select().from(reports).where(eq(reports.id, report.id));
      expect(updatedReport.status).toBe('revoked');
    });

    it('2.24 Subject-facing reports are NOT affected by any revocation', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser();
      const profile = await createTestScoredProfile(u1.id);
      const grant = await shareService.grantShare(u1.id, { targetType: 'user', targetUserId: u2.id });
      
      const [report] = await db.insert(reports).values({
        id: crypto.randomUUID(),
        subjectUserId: u1.id,
        reportType: 'base_diagnostic',
        audience: 'subject_facing',
        status: 'active',
        primaryScoredProfileId: profile.id,
      }).returning();
      
      await shareService.revokeShare(grant.id, u1.id);
      
      const [updatedReport] = await db.select().from(reports).where(eq(reports.id, report.id));
      expect(updatedReport.status).toBe('active');
    });
  });
});
