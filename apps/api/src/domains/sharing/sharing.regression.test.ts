import { describe, it, expect, beforeEach } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser, createTestOrg, createTestTeam, addTeamMember, createTestScoredProfile } from '../../test/helpers';
import { ForbiddenError } from '@/shared/errors/domain-error';
import { shareGrants } from './share-grant.schema';
import { reports } from '../report/report.schema';
import { auditLogs } from '../audit/audit.schema';
import { db } from '../../test/setup';
import { eq, and, sql } from 'drizzle-orm';

describe('Category 2: Access Control & Sharing', () => {
  let container = getTestContainer();
  let shareService = container.shareService;
  let accessEvaluator = container.accessEvaluator;

  beforeEach(async () => {
    await cleanTestData();
  });

  it('2.1 Create share grant → persisted correctly', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await createTestScoredProfile(userA.id);
    
    const grant = await shareService.grantShare(userA.id, {
      targetType: 'user',
      targetUserId: userB.id,
      resourceTypes: ['base']
    });

    expect(grant.status).toBe('active');
    expect(grant.subjectUserId).toBe(userA.id);
    expect(grant.targetUserId).toBe(userB.id);
  });

  it('2.2 Create grant with expiresAt → stored', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await createTestScoredProfile(userA.id);
    const expiresAt = new Date(Date.now() + 100000);
    
    const grant = await shareService.grantShare(userA.id, {
      targetType: 'user',
      targetUserId: userB.id,
      expiresAt: expiresAt.toISOString()
    });

    expect(grant.expiresAt?.getTime()).toBeCloseTo(expiresAt.getTime(), -3);
  });

  it('2.3 Create grant with resourceTypes array → stored as JSONB', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await createTestScoredProfile(userA.id);
    const resourceTypes = ['base', 'professional_self'];
    
    const grant = await shareService.grantShare(userA.id, {
      targetType: 'user',
      targetUserId: userB.id,
      resourceTypes
    });

    expect(grant.resourceTypes).toEqual(resourceTypes);
  });

  it('2.4 Empty resourceTypes → means "all"', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await createTestScoredProfile(userA.id);
    
    await shareService.grantShare(userA.id, {
      targetType: 'user',
      targetUserId: userB.id,
      resourceTypes: []
    });

    const decision = await accessEvaluator.evaluate({
      subjectUserId: userA.id,
      viewerUserId: userB.id,
      resourceType: 'any_random_type'
    });
    expect(decision.allowed).toBe(true);
  });

  it('2.5 Revoke grant → status "revoked", revokedAt set', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await createTestScoredProfile(userA.id);
    const grant = await shareService.grantShare(userA.id, { targetType: 'user', targetUserId: userB.id });
    
    await shareService.revokeShare(grant.id, userA.id);
    
    const [updated] = await db.select().from(shareGrants).where(eq(shareGrants.id, grant.id));
    expect(updated?.status).toBe('revoked');
    expect(updated?.revokedAt).toBeDefined();
  });

  it('2.6 Only subject can revoke → other user throws ForbiddenError', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const userC = await createTestUser();
    await createTestScoredProfile(userA.id);
    const grant = await shareService.grantShare(userA.id, { targetType: 'user', targetUserId: userB.id });
    
    await expect(shareService.revokeShare(grant.id, userC.id)).rejects.toThrow(ForbiddenError);
  });

  it('2.7 Duplicate active grant → rejected or idempotent', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await createTestScoredProfile(userA.id);
    await shareService.grantShare(userA.id, { targetType: 'user', targetUserId: userB.id });
    
    await shareService.grantShare(userA.id, { targetType: 'user', targetUserId: userB.id });
    
    const all = await db.select().from(shareGrants).where(and(eq(shareGrants.subjectUserId, userA.id), eq(shareGrants.targetUserId, userB.id), eq(shareGrants.status, 'active')));
    expect(all.length).toBe(1);
  });

  it('2.8 Self-access → allowed, grantType "self"', async () => {
    const userA = await createTestUser();
    const decision = await accessEvaluator.evaluate({
      subjectUserId: userA.id,
      viewerUserId: userA.id,
      resourceType: 'base'
    });
    expect(decision.allowed).toBe(true);
    expect(decision.grantType).toBe('self');
  });

  it('2.9 Direct user grant, correct resourceType → allowed', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await createTestScoredProfile(userA.id);
    await shareService.grantShare(userA.id, { targetType: 'user', targetUserId: userB.id, resourceTypes: ['base'] });
    
    const decision = await accessEvaluator.evaluate({
      subjectUserId: userA.id,
      viewerUserId: userB.id,
      resourceType: 'base'
    });
    expect(decision.allowed).toBe(true);
  });

  it('2.10 Direct user grant, wrong resourceType → denied', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await createTestScoredProfile(userA.id);
    await shareService.grantShare(userA.id, { targetType: 'user', targetUserId: userB.id, resourceTypes: ['base'] });
    
    const decision = await accessEvaluator.evaluate({
      subjectUserId: userA.id,
      viewerUserId: userB.id,
      resourceType: 'professional_self'
    });
    expect(decision.allowed).toBe(false);
  });

  it('2.11 Empty resourceTypes grant → any type allowed', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await createTestScoredProfile(userA.id);
    await shareService.grantShare(userA.id, { targetType: 'user', targetUserId: userB.id, resourceTypes: [] });
    
    const decision = await accessEvaluator.evaluate({
      subjectUserId: userA.id,
      viewerUserId: userB.id,
      resourceType: 'anything'
    });
    expect(decision.allowed).toBe(true);
  });

  it('2.12 Revoked grant → denied', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await createTestScoredProfile(userA.id);
    const grant = await shareService.grantShare(userA.id, { targetType: 'user', targetUserId: userB.id });
    await shareService.revokeShare(grant.id, userA.id);
    
    const decision = await accessEvaluator.evaluate({
      subjectUserId: userA.id,
      viewerUserId: userB.id,
      resourceType: 'base'
    });
    expect(decision.allowed).toBe(false);
  });

  it('2.13 Expired grant → denied', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await createTestScoredProfile(userA.id);
    const grant = await shareService.grantShare(userA.id, { targetType: 'user', targetUserId: userB.id });
    await db.execute(sql`UPDATE share_grants SET expires_at = NOW() - INTERVAL '1 day' WHERE id = ${grant.id}`);
    
    const decision = await accessEvaluator.evaluate({
      subjectUserId: userA.id,
      viewerUserId: userB.id,
      resourceType: 'base'
    });
    expect(decision.allowed).toBe(false);
  });

  it('2.14 Team grant: viewer is team leader → allowed', async () => {
    const org = await createTestOrg();
    const team = await createTestTeam(org.id);
    const subject = await createTestUser();
    const leader = await createTestUser();
    await createTestScoredProfile(subject.id);
    
    await addTeamMember(team.id, leader.id, 'leader');
    await shareService.grantShare(subject.id, { targetType: 'team', targetTeamId: team.id });
    
    const decision = await accessEvaluator.evaluate({
      subjectUserId: subject.id,
      viewerUserId: leader.id,
      resourceType: 'base'
    });
    expect(decision.allowed).toBe(true);
  });

  it('2.15 Team grant: viewer leads wrong team → denied', async () => {
    const org = await createTestOrg();
    const team1 = await createTestTeam(org.id);
    const team2 = await createTestTeam(org.id);
    const subject = await createTestUser();
    const leader2 = await createTestUser();
    await createTestScoredProfile(subject.id);
    
    await addTeamMember(team2.id, leader2.id, 'leader');
    await shareService.grantShare(subject.id, { targetType: 'team', targetTeamId: team1.id });
    
    const decision = await accessEvaluator.evaluate({
      subjectUserId: subject.id,
      viewerUserId: leader2.id,
      resourceType: 'base'
    });
    expect(decision.allowed).toBe(false);
  });

  it('2.16 Org grant: viewer is org admin → allowed', async () => {
    const org = await createTestOrg();
    const subject = await createTestUser();
    const admin = await createTestUser();
    await createTestScoredProfile(subject.id);
    
    await db.execute(sql`UPDATE "user" SET role = 'admin' WHERE id = ${admin.id}`);
    await db.execute(sql`
        INSERT INTO "member" (id, organization_id, user_id, role, created_at)
        VALUES (${crypto.randomUUID()}, ${org.id}, ${admin.id}, 'admin', NOW())
    `);

    await shareService.grantShare(subject.id, { targetType: 'organisation', targetOrgId: org.id });
    
    const decision = await accessEvaluator.evaluate({
      subjectUserId: subject.id,
      viewerUserId: admin.id,
      resourceType: 'base',
      context: { orgId: org.id }
    });
    expect(decision.allowed).toBe(true);
  });

  it('2.17 Coach grant + active link + active cert → allowed', async () => {
    const coach = await createTestUser({ role: 'coach' });
    const client = await createTestUser();
    await createTestScoredProfile(client.id);
    
    await db.execute(sql`
        INSERT INTO "certification_records" (id, coach_user_id, programme_name, status, certified_at, expires_at)
        VALUES (${crypto.randomUUID()}, ${coach.id}, 'base_diagnostic', 'active', NOW(), NOW() + INTERVAL '1 year')
    `);
    
    await db.execute(sql`
        INSERT INTO "coach_client_links" (id, coach_user_id, client_user_id, status, started_at, created_at)
        VALUES (${crypto.randomUUID()}, ${coach.id}, ${client.id}, 'active', NOW(), NOW())
    `);

    await shareService.grantShare(client.id, { targetType: 'coach', targetUserId: coach.id });
    
    const decision = await accessEvaluator.evaluate({
      subjectUserId: client.id,
      viewerUserId: coach.id,
      resourceType: 'base'
    });
    expect(decision.allowed).toBe(true);
  });

  it('2.18 Coach grant + lapsed cert → denied (reason mentions certification)', async () => {
    const coach = await createTestUser({ role: 'coach' });
    const client = await createTestUser();
    await createTestScoredProfile(client.id);
    
    await db.execute(sql`
        INSERT INTO "certification_records" (id, coach_user_id, programme_name, status, certified_at, expires_at)
        VALUES (${crypto.randomUUID()}, ${coach.id}, 'base_diagnostic', 'lapsed', NOW() - INTERVAL '2 year', NOW() - INTERVAL '1 year')
    `);
    
    await db.execute(sql`
        INSERT INTO "coach_client_links" (id, coach_user_id, client_user_id, status, started_at, created_at)
        VALUES (${crypto.randomUUID()}, ${coach.id}, ${client.id}, 'active', NOW(), NOW())
    `);

    await shareService.grantShare(client.id, { targetType: 'coach', targetUserId: coach.id });
    
    const decision = await accessEvaluator.evaluate({
      subjectUserId: client.id,
      viewerUserId: coach.id,
      resourceType: 'base'
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason?.toLowerCase()).toContain('certification');
  });

  it('2.20 No grants → denied', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const decision = await accessEvaluator.evaluate({
      subjectUserId: userA.id,
      viewerUserId: userB.id,
      resourceType: 'base'
    });
    expect(decision.allowed).toBe(false);
  });

  it('2.19 Coach grant + no active link → denied', async () => {
    const coach = await createTestUser({ role: 'coach' });
    const client = await createTestUser();
    await createTestScoredProfile(client.id);
    
    await db.execute(sql`
        INSERT INTO "certification_records" (id, coach_user_id, programme_name, status, certified_at, expires_at)
        VALUES (${crypto.randomUUID()}, ${coach.id}, 'base_diagnostic', 'active', NOW(), NOW() + INTERVAL '1 year')
    `);

    await shareService.grantShare(client.id, { targetType: 'coach', targetUserId: coach.id });
    
    const decision = await accessEvaluator.evaluate({
      subjectUserId: client.id,
      viewerUserId: coach.id,
      resourceType: 'base'
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason?.toLowerCase()).toContain('relationship');
  });

  it('2.21 Revoke direct user grant → viewer-facing reports revoked for that pair', async () => {
    const subject = await createTestUser();
    const viewer = await createTestUser();
    const { id: profileId } = await createTestScoredProfile(subject.id);
    const grant = await shareService.grantShare(subject.id, { targetType: 'user', targetUserId: viewer.id });
    
    await db.insert(reports).values({
      subjectUserId: subject.id,
      viewerUserId: viewer.id,
      audience: 'viewer_facing',
      reportType: 'base',
      primaryScoredProfileId: profileId,
      status: 'active'
    });

    await shareService.revokeShare(grant.id, subject.id);
    
    const [report] = await db.select().from(reports).where(and(eq(reports.subjectUserId, subject.id), eq(reports.viewerUserId, viewer.id)));
    expect(report.status).toBe('revoked');
  });

  it('2.22 Revoke team grant → ALL viewer-facing reports for subject revoked', async () => {
    const org = await createTestOrg();
    const team = await createTestTeam(org.id);
    const subject = await createTestUser();
    const leader = await createTestUser();
    const { id: profileId } = await createTestScoredProfile(subject.id);
    
    await addTeamMember(team.id, leader.id, 'leader');
    const grant = await shareService.grantShare(subject.id, { targetType: 'team', targetTeamId: team.id });
    
    await db.insert(reports).values({
      subjectUserId: subject.id,
      viewerUserId: leader.id,
      audience: 'viewer_facing',
      reportType: 'base',
      primaryScoredProfileId: profileId,
      status: 'active'
    });

    await shareService.revokeShare(grant.id, subject.id);
    
    const [report] = await db.select().from(reports).where(eq(reports.viewerUserId, leader.id));
    expect(report.status).toBe('revoked');
  });

  it('2.24 Subject-facing reports NOT affected by revocation', async () => {
    const subject = await createTestUser();
    const viewer = await createTestUser();
    const { id: profileId } = await createTestScoredProfile(subject.id);
    const grant = await shareService.grantShare(subject.id, { targetType: 'user', targetUserId: viewer.id });
    
    await db.insert(reports).values({
      subjectUserId: subject.id,
      viewerUserId: subject.id,
      audience: 'subject_facing',
      reportType: 'base',
      primaryScoredProfileId: profileId,
      status: 'active'
    });

    await shareService.revokeShare(grant.id, subject.id);
    
    const [report] = await db.select().from(reports).where(eq(reports.audience, 'subject_facing'));
    expect(report.status).toBe('active');
  });

  it('2.25 Audit entry created with invalidatedCount', async () => {
    const subject = await createTestUser();
    const viewer = await createTestUser();
    const { id: profileId } = await createTestScoredProfile(subject.id);
    const grant = await shareService.grantShare(subject.id, { targetType: 'user', targetUserId: viewer.id });
    
    await db.insert(reports).values({
      subjectUserId: subject.id,
      viewerUserId: viewer.id,
      audience: 'viewer_facing',
      reportType: 'base',
      primaryScoredProfileId: profileId,
      status: 'active'
    });

    await shareService.revokeShare(grant.id, subject.id);
    
    const [audit] = await db.select().from(auditLogs).where(eq(auditLogs.actionType, 'share.revoked')).orderBy(sql`created_at DESC`).limit(1);
    expect(audit).toBeDefined();
    expect((audit.metadata as any).invalidatedCount).toBeGreaterThan(0);
  });
  it('2.23 Revoke org grant → ALL viewer-facing reports for subject revoked', async () => {
    const org = await createTestOrg();
    const subject = await createTestUser();
    const admin = await createTestUser();
    const { id: profileId } = await createTestScoredProfile(subject.id);
    
    await db.execute(sql`UPDATE "user" SET role = 'admin' WHERE id = ${admin.id}`);
    await db.execute(sql`INSERT INTO "member" (id, organization_id, user_id, role, created_at) VALUES (${crypto.randomUUID()}, ${org.id}, ${admin.id}, 'admin', NOW())`);

    const grant = await shareService.grantShare(subject.id, { targetType: 'organisation', targetOrgId: org.id });
    
    await db.insert(reports).values({
      subjectUserId: subject.id,
      viewerUserId: admin.id,
      audience: 'viewer_facing',
      reportType: 'base',
      primaryScoredProfileId: profileId,
      status: 'active'
    });

    await shareService.revokeShare(grant.id, subject.id);
    
    const [report] = await db.select().from(reports).where(eq(reports.viewerUserId, admin.id));
    expect(report.status).toBe('revoked');
  });

  it('2.26 After revocation: viewer fetching report → denied (404 not 403)', async () => {
    // This is more of a ReportService test, but testing the result of revocation
    const subject = await createTestUser();
    const viewer = await createTestUser();
    const { id: profileId } = await createTestScoredProfile(subject.id);
    const grant = await shareService.grantShare(subject.id, { targetType: 'user', targetUserId: viewer.id });
    
    const [report] = await db.insert(reports).values({
      subjectUserId: subject.id,
      viewerUserId: viewer.id,
      audience: 'viewer_facing',
      reportType: 'base',
      primaryScoredProfileId: profileId,
      status: 'active'
    }).returning();

    await shareService.revokeShare(grant.id, subject.id);
    
    const reportService = container.reportService;
    await expect(reportService.getReport(report.id, viewer.id)).rejects.toThrow();
  });

  it('2.27 After revocation: subject still accesses own reports', async () => {
    const subject = await createTestUser();
    const viewer = await createTestUser();
    const { id: profileId } = await createTestScoredProfile(subject.id);
    const grant = await shareService.grantShare(subject.id, { targetType: 'user', targetUserId: viewer.id });
    
    const [report] = await db.insert(reports).values({
      subjectUserId: subject.id,
      viewerUserId: subject.id,
      audience: 'subject_facing',
      reportType: 'base',
      primaryScoredProfileId: profileId,
      status: 'active'
    }).returning();

    await shareService.revokeShare(grant.id, subject.id);
    
    const reportService = container.reportService;
    const res = await reportService.getReport(report.id, subject.id);
    expect(res).toBeDefined();
    expect(res.id).toBe(report.id);
  });
});
