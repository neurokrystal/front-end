import { describe, it, expect, beforeEach } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser, createTestOrg, createTestTeam } from '../../test/helpers';
import { db } from '../../test/setup';
import { purchases, seatAllocations } from './billing.schema';
import { eq, sql } from 'drizzle-orm';
import { auditLogs } from '../audit/audit.schema';

describe('Category 5: Billing & Entitlement', () => {
  let container = getTestContainer();
  let billingService = container.billingService;
  let commercialService = container.commercialService;

  beforeEach(async () => {
    await cleanTestData();
  });

  it('5.1 Create individual purchase → correct type/amount', async () => {
    const user = await createTestUser();
    const purchase = await billingService.initiatePurchase(user.id, user.email, {
      purchaseType: 'individual_assessment'
    });

    expect(purchase.status).toBe('pending');
    expect(purchase.checkoutUrl).toBeDefined();
  });

  it('5.2 Create org seat bundle → correct', async () => {
    const user = await createTestUser();
    const org = await createTestOrg();
    const purchase = await billingService.initiatePurchase(user.id, user.email, {
      organizationId: org.id,
      purchaseType: 'org_seat_bundle'
    });

    const [dbPurchase] = await db.select().from(purchases).where(eq(purchases.id, purchase.id));
    expect(dbPurchase.organizationId).toBe(org.id);
  });

  it('5.4 Mock completion → status "completed"', async () => {
    const user = await createTestUser();
    const purchase = await billingService.initiatePurchase(user.id, user.email, {
      purchaseType: 'individual_assessment'
    });

    await billingService.completePurchase(purchase.id, 'ext-123');
    
    const [updated] = await db.select().from(purchases).where(eq(purchases.id, purchase.id));
    expect(updated.status).toBe('completed');
  });

  it('5.5 After completion → can start run', async () => {
    const user = await createTestUser();
    const purchase = await billingService.initiatePurchase(user.id, user.email, {
      purchaseType: 'individual_assessment'
    });

    await billingService.completePurchase(purchase.id, 'ext-123');
    
    const hasEntitlement = await billingService.hasUnusedAssessmentPurchase(user.id);
    expect(hasEntitlement).toBe(true);
  });

  it('5.9 No purchase → cannot start', async () => {
    const user = await createTestUser();
    const hasEntitlement = await billingService.hasUnusedAssessmentPurchase(user.id);
    expect(hasEntitlement).toBe(false);
  });

  it('5.10 Seat allocation → created', async () => {
    const admin = await createTestUser();
    const org = await createTestOrg();
    const purchase = await billingService.initiatePurchase(admin.id, admin.email, {
      organizationId: org.id,
      purchaseType: 'org_seat_bundle'
    });
    await billingService.completePurchase(purchase.id, 'ext-123');

    const targetUser = await createTestUser();
    const allocation = await commercialService.assignSeat(org.id, targetUser.id, admin.id);
    
    expect(allocation.userId).toBe(targetUser.id);
    expect(allocation.organizationId).toBe(org.id);
    
    const hasEntitlement = await billingService.hasUnusedAssessmentPurchase(targetUser.id);
    expect(hasEntitlement).toBe(true);
  });

  it('5.11 Seat reclaim → reclaimedAt set', async () => {
    const admin = await createTestUser();
    const org = await createTestOrg();
    const purchase = await billingService.initiatePurchase(admin.id, admin.email, { organizationId: org.id, purchaseType: 'org_seat_bundle' });
    await billingService.completePurchase(purchase.id, 'ext-123');
    const targetUser = await createTestUser();
    const allocation = await commercialService.assignSeat(org.id, targetUser.id, admin.id);

    await commercialService.reclaimSeat(allocation.id, admin.id);
    
    const [reclaimed] = await db.select().from(seatAllocations).where(eq(seatAllocations.id, allocation.id));
    expect(reclaimed.reclaimedAt).toBeDefined();
    
    const hasEntitlement = await billingService.hasUnusedAssessmentPurchase(targetUser.id);
    expect(hasEntitlement).toBe(false);
  });

  it('5.12 Cannot over-allocate seats', async () => {
    const admin = await createTestUser();
    const org = await createTestOrg();
    // initiatePurchase calculates price, but doesn't set seat count. 
    // completePurchase sets seatCount to 10 by default (see billing.service.ts:93).
    // I need to find a way to test over-allocation.
    // Maybe I can manually update seatCount for testing.
    
    const purchase = await billingService.initiatePurchase(admin.id, admin.email, { organizationId: org.id, purchaseType: 'org_seat_bundle' });
    await billingService.completePurchase(purchase.id, 'ext-123');

    // Delete all but 1 allocation to test limit
    const allAllocations = await db.select().from(seatAllocations).where(eq(seatAllocations.organizationId, org.id));
    for (let i = 1; i < allAllocations.length; i++) {
        await db.delete(seatAllocations).where(eq(seatAllocations.id, allAllocations[i].id));
    }

    const u1 = await createTestUser();
    await commercialService.assignSeat(org.id, u1.id, admin.id);

    const u2 = await createTestUser();
    await expect(commercialService.assignSeat(org.id, u2.id, admin.id)).rejects.toThrow();
  });

  it('5.15 BILLING_PURCHASED audit entry', async () => {
     const user = await createTestUser();
     const purchase = await billingService.initiatePurchase(user.id, user.email, { purchaseType: 'individual_assessment' });
     await billingService.completePurchase(purchase.id, 'ext-123');

     const [audit] = await db.select().from(auditLogs).where(eq(auditLogs.actionType, 'billing.purchase_completed')).orderBy(sql`created_at DESC`).limit(1);
     expect(audit).toBeDefined();
     expect(audit.actorUserId).toBe(user.id);
  });
});
