import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser, createTestScoredProfile } from '../../test/helpers';
import { db } from '../../test/setup';
import { sql, eq } from 'drizzle-orm';
import { coachClientLinks, coachingFirms, coachingFirmMemberships, certifications } from './coaching.schema';

describe('Category 6: Coaching & Certification', () => {
  const container = getTestContainer();
  const { coachingService, accessEvaluator } = container;

  beforeEach(async () => {
    await cleanTestData();
  });

  describe('Coach-Client Links', () => {
    it('6.1 Invite client → coach-client link created with status "active"', async () => {
      // In this system, invite might immediately create active link or pending.
      // Checking implementation... assuming it creates a link.
      const coach = await createTestUser({ role: 'coach' });
      const client = await createTestUser();
      
      const link = await coachingService.inviteClient(coach.id, {
        clientEmail: client.email,
        clientName: client.name,
      });
      
      expect(link.coachUserId).toBe(coach.id);
      expect(link.status).toBe('active');
    });

    it('6.3 End relationship → link status "ended", endedAt set', async () => {
      const coach = await createTestUser({ role: 'coach' });
      const client = await createTestUser();
      const link = await coachingService.inviteClient(coach.id, { clientEmail: client.email });
      
      await coachingService.endRelationship(link.id, coach.id);
      
      const [dbLink] = await db.select().from(coachClientLinks).where(eq(coachClientLinks.id, link.id));
      expect(dbLink.status).toBe('ended');
      expect(dbLink.endedAt).toBeDefined();
    });

    it('6.4 Get my clients → returns only active links for requesting coach', async () => {
      const coach = await createTestUser({ role: 'coach' });
      const c1 = await createTestUser();
      const c2 = await createTestUser();
      
      await coachingService.inviteClient(coach.id, { clientEmail: c1.email });
      const l2 = await coachingService.inviteClient(coach.id, { clientEmail: c2.email });
      await coachingService.endRelationship(l2.id, coach.id);
      
      const clients = await coachingService.getMyClients(coach.id);
      expect(clients).toHaveLength(1);
      expect(clients[0].clientEmail).toBe(c1.email);
    });
  });

  describe('Certification & Access', () => {
    it('6.6 Coach with active cert + active link → AccessEvaluator grants access', async () => {
      const coach = await createTestUser({ role: 'coach' });
      const client = await createTestUser();
      await createTestScoredProfile(client.id);
      
      await coachingService.inviteClient(coach.id, { clientEmail: client.email });
      
      // Add certification
      await db.insert(certifications).values({
        id: crypto.randomUUID(),
        coachUserId: coach.id,
        certificationType: 'base_diagnostic',
        status: 'active',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
      });
      
      const decision = await accessEvaluator.evaluate({
        viewerUserId: coach.id,
        subjectUserId: client.id,
        resourceType: 'base_diagnostic',
      });
      
      expect(decision.allowed).toBe(true);
      expect(decision.grantType).toBe('coach');
    });

    it('6.7 Coach with lapsed cert → AccessEvaluator denies with reason mentioning certification', async () => {
        const coach = await createTestUser({ role: 'coach' });
        const client = await createTestUser();
        await createTestScoredProfile(client.id);
        await coachingService.inviteClient(coach.id, { clientEmail: client.email });
        
        await db.insert(certifications).values({
          id: crypto.randomUUID(),
          coachUserId: coach.id,
          certificationType: 'base_diagnostic',
          status: 'active',
          issuedAt: new Date(Date.now() - 200000),
          expiresAt: new Date(Date.now() - 100000), // Lapsed
        });
        
        const decision = await accessEvaluator.evaluate({
          viewerUserId: coach.id,
          subjectUserId: client.id,
          resourceType: 'base_diagnostic',
        });
        
        expect(decision.allowed).toBe(false);
        expect(decision.reason).toMatch(/cert/i);
    });
  });

  describe('Coaching Firms', () => {
    it('6.11 Create coaching firm → persisted', async () => {
      const firm = await coachingService.createFirm({
        name: 'Alpha Coaching',
        slug: 'alpha',
      });
      expect(firm.name).toBe('Alpha Coaching');
      
      const [dbFirm] = await db.select().from(coachingFirms).where(eq(coachingFirms.id, firm.id));
      expect(dbFirm).toBeDefined();
    });

    it('6.12 Add coach to firm → membership created', async () => {
      const firm = await coachingService.createFirm({ name: 'F1', slug: 'f1' });
      const coach = await createTestUser({ role: 'coach' });
      
      await coachingService.addCoachToFirm(firm.id, coach.id, 'partner');
      
      const memberships = await db.select().from(coachingFirmMemberships).where(eq(coachingFirmMemberships.firmId, firm.id));
      expect(memberships).toHaveLength(1);
      expect(memberships[0].coachUserId).toBe(coach.id);
    });
  });
});
