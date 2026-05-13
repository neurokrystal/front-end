import { describe, it, expect, beforeEach } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser, createTestScoredProfile, createTestPurchase } from '../../test/helpers';
import { db } from '../../test/setup';
import { instruments, instrumentVersions, instrumentItems, instrumentRuns, instrumentResponses } from './instrument.schema';
import { eq, and, sql } from 'drizzle-orm';
import { auditLogs } from '../audit/audit.schema';

describe('Category 4: Instrument & Run', () => {
  let container = getTestContainer();
  let instrumentService = container.instrumentService;
  let runService = container.runService;

  beforeEach(async () => {
    await cleanTestData();
  });

  async function setupInstrument() {
    const [inst] = await db.insert(instruments).values({
      slug: 'base-diag',
      name: 'Base Diagnostic',
      description: 'Test',
      status: 'active'
    }).returning();

    const [version] = await db.insert(instrumentVersions).values({
      instrumentId: inst.id,
      versionNumber: 1,
      itemCount: 2,
      scoringStrategyKey: 'base-diag-v1',
      configJson: { 
        version: 1, 
        instrumentSlug: 'base-diag', 
        responseScale: { min: 1, max: 5, type: 'likert' },
        itemRules: [
          { itemId: 'item-1', domain: 'safety', dimension: 'self', state: 'felt' },
          { itemId: 'item-2', domain: 'safety', dimension: 'self', state: 'expressed' }
        ],
        dimensions: [{ dimension: 'self', domain: 'safety', aggregation: 'mean', bandThresholds: [] }],
        domains: [{ domain: 'safety', aggregation: 'mean', bandThresholds: [] }],
        alignment: { gapMethod: 'absolute_difference' },
        consistency: { enabled: false }
      }
    }).returning();

    await db.insert(instrumentItems).values([
      { id: 'item-1', instrumentVersionId: version.id, ordinal: 1, itemText: 'Q1', domainTag: 'safety' },
      { id: 'item-2', instrumentVersionId: version.id, ordinal: 2, itemText: 'Q2', domainTag: 'safety' }
    ]);

    return { inst, version };
  }

  it('4.1 Create instrument → persisted', async () => {
    const { inst } = await setupInstrument();
    const [found] = await db.select().from(instruments).where(eq(instruments.id, inst.id));
    expect(found).toBeDefined();
    expect(found?.slug).toBe('base-diag');
  });

  it('4.2 Create version with items → linked', async () => {
    const { version } = await setupInstrument();
    const items = await db.select().from(instrumentItems).where(eq(instrumentItems.instrumentVersionId, version.id));
    expect(items.length).toBe(2);
  });

  it('4.3 Find active by slug → correct', async () => {
    await setupInstrument();
    const active = await instrumentService.getActiveInstrument('base-diag');
    expect(active).toBeDefined();
    expect(active.slug).toBe('base-diag');
  });

  it('4.5 Start run → status "in_progress"', async () => {
    const user = await createTestUser();
    await setupInstrument();
    await createTestPurchase(user.id, 'individual_assessment');

    const run = await runService.startRun(user.id, { instrumentSlug: 'base-diag' });
    expect(run.status).toBe('in_progress');
    // startRun returns RunStatusOutput which has items count or similar, let's check
    const detail = await runService.getRunDetail(run.id);
    expect(detail.items.length).toBe(2);
  });

  it('4.7 Submit response → persisted', async () => {
    const user = await createTestUser();
    await setupInstrument();
    await createTestPurchase(user.id, 'individual_assessment');
    const run = await runService.startRun(user.id, { instrumentSlug: 'base-diag' });

    await runService.submitResponse(run.id, {
      itemId: 'item-1',
      responseValue: 4
    });

    const [resp] = await db.select().from(instrumentResponses).where(and(eq(instrumentResponses.runId, run.id), eq(instrumentResponses.itemId, 'item-1')));
    expect(resp.responseValue).toBe(4);
  });

  it('4.9 Complete with all responses → "completed", scoring triggered', async () => {
    const user = await createTestUser();
    await setupInstrument();
    await createTestPurchase(user.id, 'individual_assessment');
    const run = await runService.startRun(user.id, { instrumentSlug: 'base-diag' });

    await runService.submitBatchResponses(run.id, {
      responses: [
        { itemId: 'item-1', responseValue: 4 },
        { itemId: 'item-2', responseValue: 3 }
      ]
    });

    await runService.completeRun(run.id);
    
    const [updated] = await db.select().from(instrumentRuns).where(eq(instrumentRuns.id, run.id));
    expect(updated.status).toBe('completed');
    
    // Verify scored profile created
    const profiles = await container.scoringService.getUserProfiles(user.id);
    expect(profiles.length).toBeGreaterThan(0);
  });

  it('4.10 Complete with missing responses → error', async () => {
    const user = await createTestUser();
    await setupInstrument();
    await createTestPurchase(user.id, 'individual_assessment');
    const run = await runService.startRun(user.id, { instrumentSlug: 'base-diag' });

    await runService.submitResponse(run.id, { itemId: 'item-1', responseValue: 4 });

    await expect(runService.completeRun(run.id)).rejects.toThrow();
  });

  it('4.11 Cannot start without entitlement → error', async () => {
    const user = await createTestUser();
    await setupInstrument();
    // No purchase
    await expect(runService.startRun(user.id, { instrumentSlug: 'base-diag' })).rejects.toThrow();
  });

  it('4.14 RUN_STARTED audit entry', async () => {
    const user = await createTestUser();
    await setupInstrument();
    await createTestPurchase(user.id, 'individual_assessment');
    await runService.startRun(user.id, { instrumentSlug: 'base-diag' });

    const [audit] = await db.select().from(auditLogs).where(eq(auditLogs.actionType, 'instrument.run_started')).orderBy(sql`created_at DESC`).limit(1);
    expect(audit).toBeDefined();
    expect(audit.actorUserId).toBe(user.id);
  });

  it('4.15 RUN_COMPLETED audit entry', async () => {
     const user = await createTestUser();
     await setupInstrument();
     await createTestPurchase(user.id, 'individual_assessment');
     const run = await runService.startRun(user.id, { instrumentSlug: 'base-diag' });
     await runService.submitBatchResponses(run.id, { responses: [{ itemId: 'item-1', responseValue: 4 }, { itemId: 'item-2', responseValue: 3 }] });
     await runService.completeRun(run.id);

     const [audit] = await db.select().from(auditLogs).where(eq(auditLogs.actionType, 'instrument.run_completed')).orderBy(sql`created_at DESC`).limit(1);
     expect(audit).toBeDefined();
     expect(audit.actorUserId).toBe(user.id);
  });
});
