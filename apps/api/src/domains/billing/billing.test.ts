import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser, createTestOrg } from '../../test/helpers';
import { db } from '../../test/setup';
import { sql, eq } from 'drizzle-orm';
import { purchases, seatAllocations } from './billing.schema';

describe('Category 5: Billing & Entitlement', () => {
  const container = getTestContainer();
  const { billingService } = container;

  beforeEach(async () => {
    await cleanTestData();
  });

  describe('Purchase Lifecycle', () => {
    it('5.1 Create individual assessment purchase → correct type and amount', async () => {
      const user = await createTestUser();
      const purchase = await billingService.initiatePurchase(user.id, user.email, {
        purchaseType: 'individual_assessment',
      });
      expect(purchase.purchaseType).toBe('individual_assessment');
      // Default price for individual assessment is 2500 cents ($25)
      const [dbPurchase] = await db.select().from(purchases).where(eq(purchases.id, purchase.id));
      expect(dbPurchase.amountCents).toBe(2500);
    });

    it('5.2 Create org seat bundle → correct type', async () => {
      const user = await createTestUser();
      const org = await createTestOrg();
      const purchase = await billingService.initiatePurchase(user.id, user.email, {
        purchaseType: 'org_seat_bundle',
        organizationId: org.id,
        quantity: 10,
      });
      expect(purchase.purchaseType).toBe('org_seat_bundle');
      expect(purchase.quantity).toBe(10);
    });

    it('5.3 Mock checkout → returns checkout URL', async () => {
        const user = await createTestUser();
        const purchase = await billingService.initiatePurchase(user.id, user.email, { purchaseType: 'individual_assessment' });
        expect(purchase.checkoutUrl).toBeDefined();
        expect(purchase.checkoutUrl).toContain('mock-checkout');
    });

    it('5.4 Mock payment completion → purchase status "completed"', async () => {
        const user = await createTestUser();
        const purchase = await billingService.initiatePurchase(user.id, user.email, { purchaseType: 'individual_assessment' });
        await billingService.completePurchase(purchase.id, 'stripe_tx_123');
        const [dbPurchase] = await db.select().from(purchases).where(eq(purchases.id, purchase.id));
        expect(dbPurchase.status).toBe('completed');
        expect(dbPurchase.externalTransactionId).toBe('stripe_tx_123');
    });
  });

  describe('Entitlement Checks', () => {
    it('5.5 After completion: user can start a run', async () => {
      const user = await createTestUser();
      const purchase = await billingService.initiatePurchase(user.id, user.email, { purchaseType: 'individual_assessment' });
      await billingService.completePurchase(purchase.id, 'tx_1');
      
      const hasEntitlement = await billingService.hasUnusedAssessmentPurchase(user.id);
      expect(hasEntitlement).toBe(true);
    });

    it('5.6 User with used purchase → cannot start another run', async () => {
        const user = await createTestUser();
        const purchase = await billingService.initiatePurchase(user.id, user.email, { purchaseType: 'individual_assessment' });
        await billingService.completePurchase(purchase.id, 'tx_1');
        
        // Mock using it
        await db.update(purchases).set({ usedAt: new Date() }).where(eq(purchases.id, purchase.id));
        
        const hasEntitlement = await billingService.hasUnusedAssessmentPurchase(user.id);
        expect(hasEntitlement).toBe(false);
    });

    it('5.9 User with no purchase → cannot start a run', async () => {
        const user = await createTestUser();
        expect(await billingService.hasUnusedAssessmentPurchase(user.id)).toBe(false);
    });
  });

  describe('Seat Allocations', () => {
    it('5.10 Seat allocation → created correctly', async () => {
      const admin = await createTestUser();
      const org = await createTestOrg();
      const user = await createTestUser();
      
      const purchase = await billingService.initiatePurchase(admin.id, admin.email, {
        purchaseType: 'org_seat_bundle',
        organizationId: org.id,
        quantity: 5,
      });
      await billingService.completePurchase(purchase.id, 'tx_seat');
      
      const allocation = await billingService.allocateSeat(org.id, user.id);
      expect(allocation.userId).toBe(user.id);
      expect(allocation.organizationId).toBe(org.id);
      
      expect(await billingService.hasActiveOrgSeat(user.id)).toBe(true);
    });

    it('5.11 Seat reclaim → reclaimedAt set', async () => {
        const admin = await createTestUser();
        const org = await createTestOrg();
        const user = await createTestUser();
        const purchase = await billingService.initiatePurchase(admin.id, admin.email, { purchaseType: 'org_seat_bundle', organizationId: org.id, quantity: 5 });
        await billingService.completePurchase(purchase.id, 'tx_seat');
        
        const allocation = await billingService.allocateSeat(org.id, user.id);
        await billingService.reclaimSeat(allocation.id);
        
        const [dbAlloc] = await db.select().from(seatAllocations).where(eq(seatAllocations.id, allocation.id));
        expect(dbAlloc.reclaimedAt).toBeDefined();
        expect(await billingService.hasActiveOrgSeat(user.id)).toBe(false);
    });

    it('5.12 Cannot allocate more seats than purchased', async () => {
        const admin = await createTestUser();
        const org = await createTestOrg();
        const purchase = await billingService.initiatePurchase(admin.id, admin.email, { purchaseType: 'org_seat_bundle', organizationId: org.id, quantity: 1 });
        await billingService.completePurchase(purchase.id, 'tx_seat');
        
        await billingService.allocateSeat(org.id, (await createTestUser()).id);
        await expect(billingService.allocateSeat(org.id, (await createTestUser()).id)).rejects.toThrow(/capacity/i);
    });
  });
});
