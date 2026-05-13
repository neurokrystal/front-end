import { describe, it, expect, beforeEach } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser } from '../../test/helpers';
import { db } from '../../test/setup';
import { coachClientLinks, certificationRecords, coachingFirms, coachingFirmMemberships } from './coaching.schema';
import { eq, sql } from 'drizzle-orm';

describe('Category 6: Coaching & Certification', () => {
  let container = getTestContainer();
  let coachingService = container.coachingService;

  beforeEach(async () => {
    await cleanTestData();
  });

  async function certifyCoach(coachUserId: string) {
    await db.insert(certificationRecords).values({
      id: crypto.randomUUID(),
      coachUserId,
      programmeName: 'base_diagnostic',
      status: 'active',
      certifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 31536000000)
    });
  }

  it('6.1 Invite client → link created, status "pending"', async () => {
    const coach = await createTestUser({ role: 'coach' });
    await certifyCoach(coach.id);
    const client = await createTestUser();
    
    const link = await coachingService.inviteClient(coach.id, client.email);
    expect(link.coachUserId).toBe(coach.id);
    expect(link.status).toBe('pending');
  });

  it('6.2 Accept invite → activated', async () => {
    const coach = await createTestUser({ role: 'coach' });
    await certifyCoach(coach.id);
    const client = await createTestUser();
    const link = await coachingService.inviteClient(coach.id, client.email);

    await coachingService.acceptClientInvite(link.inviteToken, client.id);
    
    const [updated] = await db.select().from(coachClientLinks).where(eq(coachClientLinks.id, link.id));
    expect(updated.status).toBe('active');
    expect(updated.clientUserId).toBe(client.id);
  });

  it('6.3 End relationship → status "ended"', async () => {
    const coach = await createTestUser({ role: 'coach' });
    await certifyCoach(coach.id);
    const client = await createTestUser();
    const link = await coachingService.inviteClient(coach.id, client.email);
    await coachingService.acceptClientInvite(link.inviteToken, client.id);

    await coachingService.endClientRelationship(link.id, coach.id);
    
    const [updated] = await db.select().from(coachClientLinks).where(eq(coachClientLinks.id, link.id));
    expect(updated.status).toBe('ended');
  });

  it('6.4 Get my clients → only active links for requesting coach', async () => {
    const coach = await createTestUser({ role: 'coach' });
    await certifyCoach(coach.id);
    const c1 = await createTestUser();
    const c2 = await createTestUser();
    
    const l1 = await coachingService.inviteClient(coach.id, c1.email);
    await coachingService.acceptClientInvite(l1.inviteToken, c1.id);
    const l2 = await coachingService.inviteClient(coach.id, c2.email);
    await coachingService.acceptClientInvite(l2.inviteToken, c2.id);

    const clients = await coachingService.getMyClients(coach.id);
    expect(clients.length).toBe(2);
  });

  it('6.11 Create firm → persisted', async () => {
     const owner = await createTestUser();
     const firm = await coachingService.createFirm(owner.id, 'Elite Coaching');

     expect(firm.name).toBe('Elite Coaching');
     const [found] = await db.select().from(coachingFirms).where(eq(coachingFirms.id, firm.id));
     expect(found).toBeDefined();
  });
});
