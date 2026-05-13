import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser } from '../../test/helpers';
import { db } from '../../test/setup';
import { instruments, instrumentVersions, instrumentItems } from './instrument.schema';
import { instrumentRuns, instrumentResponses } from './features/run/run.schema';
import { sql, eq } from 'drizzle-orm';
import { NotFoundError, DomainError } from '../../shared/errors/domain-error';

describe('Category 4: Instrument & Run', () => {
  const container = getTestContainer();
  const { instrumentService, runService, billingService, scoringService, reportService } = container;

  beforeEach(async () => {
    await cleanTestData();
  });

  describe('Instrument Management', () => {
    it('4.1 Create instrument → persisted', async () => {
      const id = crypto.randomUUID();
      await db.insert(instruments).values({
        id,
        name: 'Test Instrument',
        slug: 'test-slug',
        status: 'active',
      });
      const [dbInst] = await db.select().from(instruments).where(eq(instruments.id, id));
      expect(dbInst.name).toBe('Test Instrument');
    });

    it('4.2 Create version with items → linked correctly', async () => {
      const instId = crypto.randomUUID();
      await db.insert(instruments).values({ id: instId, name: 'T1', slug: 't1', status: 'active' });
      
      const vId = crypto.randomUUID();
      await db.insert(instrumentVersions).values({
        id: vId,
        instrumentId: instId,
        versionNumber: 1,
        itemCount: 1,
        scoringStrategyKey: 'config-driven',
      });
      
      await db.insert(instrumentItems).values({
        id: crypto.randomUUID(),
        instrumentVersionId: vId,
        ordinal: 1,
        itemText: 'Q1',
        domainTag: 'safety',
        dimensionTag: 'self',
        stateTag: 'felt',
      });
      
      const items = await db.select().from(instrumentItems).where(eq(instrumentItems.instrumentVersionId, vId));
      expect(items).toHaveLength(1);
    });

    it('4.3 Find active instrument by slug → returns correct one', async () => {
      const id = crypto.randomUUID();
      await db.insert(instruments).values({ id, name: 'Active', slug: 'active-slug', status: 'active' });
      const inst = await instrumentService.getInstrumentBySlug('active-slug');
      expect(inst.id).toBe(id);
    });

    it('4.4 Inactive instrument → not found by slug', async () => {
      await db.insert(instruments).values({ id: crypto.randomUUID(), name: 'Inactive', slug: 'inactive-slug', status: 'inactive' });
      await expect(instrumentService.getInstrumentBySlug('inactive-slug')).rejects.toThrow(NotFoundError);
    });
  });

  describe('Run Lifecycle', () => {
    let instrumentId: string;
    let versionId: string;

    beforeEach(async () => {
      instrumentId = crypto.randomUUID();
      await db.insert(instruments).values({ id: instrumentId, name: 'Diagnostic', slug: 'diagnostic', status: 'active' });
      versionId = crypto.randomUUID();
      await db.insert(instrumentVersions).values({
        id: versionId,
        instrumentId,
        versionNumber: 1,
        itemCount: 2,
        scoringStrategyKey: 'config-driven',
        isActive: true,
      });
      await db.insert(instrumentItems).values([
        { id: 'item-1', instrumentVersionId: versionId, ordinal: 1, itemText: 'I1', domainTag: 'safety', dimensionTag: 'self', stateTag: 'felt' },
        { id: 'item-2', instrumentVersionId: versionId, ordinal: 2, itemText: 'I2', domainTag: 'safety', dimensionTag: 'self', stateTag: 'felt' },
      ]);
    });

    it('4.5 Start run → creates record with status "in_progress"', async () => {
      const user = await createTestUser();
      vi.spyOn(billingService, 'hasUnusedAssessmentPurchase').mockResolvedValue(true);
      
      const run = await runService.startRun(user.id, { instrumentSlug: 'diagnostic' });
      expect(run.status).toBe('in_progress');
      
      const [dbRun] = await db.select().from(instrumentRuns).where(eq(instrumentRuns.id, run.id));
      expect(dbRun.status).toBe('in_progress');
    });

    it('4.6 Start run returns items for the instrument version', async () => {
        const user = await createTestUser();
        vi.spyOn(billingService, 'hasUnusedAssessmentPurchase').mockResolvedValue(true);
        const run = await runService.startRun(user.id, { instrumentSlug: 'diagnostic' });
        const detail = await runService.getRunDetail(run.id);
        expect(detail.items).toHaveLength(2);
    });

    it('4.7 Submit response → persisted with correct value', async () => {
        const user = await createTestUser();
        vi.spyOn(billingService, 'hasUnusedAssessmentPurchase').mockResolvedValue(true);
        const run = await runService.startRun(user.id, { instrumentSlug: 'diagnostic' });
        
        await runService.submitResponse(run.id, { itemId: 'item-1', responseValue: 4 });
        const [resp] = await db.select().from(instrumentResponses).where(and(eq(instrumentResponses.instrumentRunId, run.id), eq(instrumentResponses.itemId, 'item-1')));
        expect(resp.responseValue).toBe(4);
    });

    it('4.8 Submit batch responses → all persisted', async () => {
        const user = await createTestUser();
        vi.spyOn(billingService, 'hasUnusedAssessmentPurchase').mockResolvedValue(true);
        const run = await runService.startRun(user.id, { instrumentSlug: 'diagnostic' });
        
        await runService.submitBatchResponses(run.id, {
            responses: [
                { itemId: 'item-1', responseValue: 4 },
                { itemId: 'item-2', responseValue: 2 }
            ]
        });
        const resps = await db.select().from(instrumentResponses).where(eq(instrumentResponses.instrumentRunId, run.id));
        expect(resps).toHaveLength(2);
    });

    it('4.9 Complete run with all responses → status "completed", scoring triggered', async () => {
        const user = await createTestUser();
        vi.spyOn(billingService, 'hasUnusedAssessmentPurchase').mockResolvedValue(true);
        const run = await runService.startRun(user.id, { instrumentSlug: 'diagnostic' });
        await runService.submitBatchResponses(run.id, {
            responses: [
                { itemId: 'item-1', responseValue: 4 },
                { itemId: 'item-2', responseValue: 2 }
            ]
        });

        vi.spyOn(scoringService, 'scoreRun').mockResolvedValue({ id: 'p1' } as any);
        vi.spyOn(scoringService, 'getProfileById').mockResolvedValue({ 
          id: 'p1', 
          profilePayload: { domains: [], dimensions: [], alignments: [] } 
        } as any);
        vi.spyOn(reportService, 'generateReport').mockResolvedValue({ id: 'r1' } as any);
        
        await runService.completeRun(run.id);
        const [dbRun] = await db.select().from(instrumentRuns).where(eq(instrumentRuns.id, run.id));
        expect(dbRun.status).toBe('completed');
        expect(scoringService.scoreRun).toHaveBeenCalled();
    });

    it('4.10 Complete run with missing responses → error listing missing count', async () => {
        const user = await createTestUser();
        vi.spyOn(billingService, 'hasUnusedAssessmentPurchase').mockResolvedValue(true);
        const run = await runService.startRun(user.id, { instrumentSlug: 'diagnostic' });
        await runService.submitResponse(run.id, { itemId: 'item-1', responseValue: 4 });
        
        await expect(runService.completeRun(run.id)).rejects.toThrow(/missing/i);
    });

    it('4.11 Cannot start run without entitlement → error', async () => {
        const user = await createTestUser();
        vi.spyOn(billingService, 'hasUnusedAssessmentPurchase').mockResolvedValue(false);
        vi.spyOn(billingService, 'hasActiveOrgSeat').mockResolvedValue(false);
        
        await expect(runService.startRun(user.id, { instrumentSlug: 'diagnostic' })).rejects.toThrow(DomainError);
    });

    it('4.12 Partial run: submit 1 of 2, fetch status → shows 1/2 in_progress', async () => {
        const user = await createTestUser();
        vi.spyOn(billingService, 'hasUnusedAssessmentPurchase').mockResolvedValue(true);
        const run = await runService.startRun(user.id, { instrumentSlug: 'diagnostic' });
        await runService.submitResponse(run.id, { itemId: 'item-1', responseValue: 4 });
        
        const status = await runService.getRunStatus(run.id);
        expect(status.responsesCount).toBe(1);
        expect(status.totalItems).toBe(2);
        expect(status.status).toBe('in_progress');
    });
  });
});
