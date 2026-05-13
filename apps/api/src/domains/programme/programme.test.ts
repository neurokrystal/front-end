import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser, createTestOrg, createTestTeam, addTeamMember } from '../../test/helpers';
import { db } from '../../test/setup';
import { sql, eq } from 'drizzle-orm';
import { programmes, enrolments } from './programme.schema';

describe('Category 8: Programmes', () => {
  const container = getTestContainer();
  const { programmeService } = container;

  beforeEach(async () => {
    await cleanTestData();
  });

  describe('Lifecycle', () => {
    it('8.1 Create programme → persisted with correct fields', async () => {
      const p = await db.insert(programmes).values({
        id: crypto.randomUUID(),
        name: 'Leadership 101',
        slug: 'leadership-101',
        description: 'Basic leadership skills',
        moduleCount: 3,
        status: 'active',
      }).returning();
      
      expect(p[0].name).toBe('Leadership 101');
    });

    it('8.2 Enrol user → enrolment created with status "enrolled"', async () => {
      const u = await createTestUser();
      const p = await db.insert(programmes).values({
        id: crypto.randomUUID(),
        name: 'P1',
        slug: 'p1',
        moduleCount: 1,
        status: 'active',
      }).returning();
      
      const enrolment = await programmeService.enrolUser(u.id, p[0].id);
      expect(enrolment.status).toBe('enrolled');
      
      const [dbEnrol] = await db.select().from(enrolments).where(eq(enrolments.id, enrolment.id));
      expect(dbEnrol).toBeDefined();
    });

    it('8.3 Enrol team → enrolments created for all team members', async () => {
      const org = await createTestOrg();
      const team = await createTestTeam(org.id);
      const u1 = await createTestUser();
      const u2 = await createTestUser();
      await addTeamMember(team.id, u1.id);
      await addTeamMember(team.id, u2.id);
      
      const p = await db.insert(programmes).values({
        id: crypto.randomUUID(),
        name: 'Team P',
        slug: 'team-p',
        moduleCount: 1,
        status: 'active',
      }).returning();
      
      await programmeService.enrolTeam(team.id, p[0].id);
      
      const teamEnrolments = await db.select().from(enrolments).where(eq(enrolments.programmeId, p[0].id));
      expect(teamEnrolments).toHaveLength(2);
    });

    it('8.4 Update progress → module status updated in progress_json', async () => {
      const u = await createTestUser();
      const p = await db.insert(programmes).values({ id: crypto.randomUUID(), name: 'P', slug: 'p', moduleCount: 5 }).returning();
      const enrolment = await programmeService.enrolUser(u.id, p[0].id);
      
      await programmeService.updateProgress(enrolment.id, {
        moduleId: 'm1',
        status: 'completed',
      });
      
      const [dbEnrol] = await db.select().from(enrolments).where(eq(enrolments.id, enrolment.id));
      expect(dbEnrol.progressJson).toMatchObject({ modules: { m1: { status: 'completed' } } });
    });

    it('8.5 Submit reflection → response stored in progress_json', async () => {
        const u = await createTestUser();
        const p = await db.insert(programmes).values({ id: crypto.randomUUID(), name: 'P', slug: 'p', moduleCount: 5 }).returning();
        const enrolment = await programmeService.enrolUser(u.id, p[0].id);
        
        await programmeService.submitReflection(enrolment.id, 'm1', 'Feeling great!');
        
        const [dbEnrol] = await db.select().from(enrolments).where(eq(enrolments.id, enrolment.id));
        expect(dbEnrol.progressJson).toMatchObject({ modules: { m1: { reflection: 'Feeling great!' } } });
    });

    it('8.8 Complete all modules → enrolment status "completed"', async () => {
        const u = await createTestUser();
        const p = await db.insert(programmes).values({ id: crypto.randomUUID(), name: 'P', slug: 'p', moduleCount: 1 }).returning();
        const enrolment = await programmeService.enrolUser(u.id, p[0].id);
        
        await programmeService.updateProgress(enrolment.id, { moduleId: 'm1', status: 'completed' });
        
        const [dbEnrol] = await db.select().from(enrolments).where(eq(enrolments.id, enrolment.id));
        expect(dbEnrol.status).toBe('completed');
    });
  });
});
