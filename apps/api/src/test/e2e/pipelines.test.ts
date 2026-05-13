import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser, generateResponses, createTestOrg, createTestTeam, addTeamMember } from '../helpers';
import { db } from '../setup';
import { sql, eq } from 'drizzle-orm';
import { instruments, instrumentVersions, instrumentItems } from '../../domains/instrument/instrument.schema';
import { reportTemplates } from '../../domains/report/features/template/template.schema';
import { reportContentBlocks } from '../../domains/report/features/cms/cms.schema';

describe('Category 13: End-to-End Pipelines', () => {
  const container = getTestContainer();
  const { runService, scoringService, reportService, billingService, shareService, accessEvaluator } = container;

  beforeEach(async () => {
    await cleanTestData();

    // Setup basic instrument and report content for E2E
    const instId = crypto.randomUUID();
    await db.insert(instruments).values({ id: instId, name: 'Diagnostic', slug: 'diagnostic', status: 'active' });
    const vId = crypto.randomUUID();
    await db.insert(instrumentVersions).values({ id: vId, instrumentId: instId, versionNumber: 1, itemCount: 66, scoringStrategyKey: 'config-driven', isActive: true });
    
    // Seed 66 items
    const items = Array.from({ length: 66 }, (_, i) => ({
      id: `item-${i + 1}`,
      instrumentVersionId: vId,
      ordinal: i + 1,
      itemText: `Item ${i + 1}`,
      domainTag: i < 22 ? 'safety' : (i < 44 ? 'challenge' : 'play'),
      dimensionTag: 'self',
      stateTag: 'felt',
    }));
    await db.insert(instrumentItems).values(items);

    // Seed report template
    await db.insert(reportTemplates).values({
      id: crypto.randomUUID(),
      reportType: 'base_diagnostic',
      name: 'Base',
      templateJson: { pages: [{ children: [{ type: 'text', content: 'Result: {{domain.safety.band}}' }] }] } as any,
      isActive: true,
      isDefault: true,
      version: 1,
    });

    // Seed CMS
    const bands = ['very_low', 'low', 'slightly_low', 'balanced', 'excessive'] as const;
    for (const band of bands) {
      await db.insert(reportContentBlocks).values({
        id: crypto.randomUUID(),
        reportType: 'base_diagnostic',
        sectionKey: 'any',
        scoreBand: band,
        contentText: `You are ${band}`,
        isActive: true,
      });
    }
    
    vi.spyOn(container.pdfGenerator, 'generateFromHtml').mockResolvedValue(Buffer.from('%PDF-data'));
  });

  describe('Full Individual Flow', () => {
    it('13.1 INDIVIDUAL FLOW: purchase → run → score → report → PDF', async () => {
      const user = await createTestUser();
      
      // 1. Purchase
      const purchase = await billingService.initiatePurchase(user.id, user.email, { purchaseType: 'individual_assessment' });
      await billingService.completePurchase(purchase.id, 'tx_123');
      
      // 2. Start Run
      const run = await runService.startRun(user.id, { instrumentSlug: 'diagnostic' });
      
      // 3. Submit 66 responses
      const responses = generateResponses({ safety: 4, challenge: 3, play: 2 });
      await runService.submitBatchResponses(run.id, { responses: responses.map(r => ({ itemId: r.itemId, responseValue: r.value })) });
      
      // 4. Complete & Score
      await runService.completeRun(run.id);
      
      // 5. Verify Report
      const userReports = await reportService.getUserReports(user.id, user.id);
      expect(userReports).toHaveLength(1);
      expect(userReports[0].reportType).toBe('base_diagnostic');
      
      // 6. Download PDF
      const pdf = await reportService.getReportPdf(userReports[0].id, user.id);
      expect(pdf.toString('utf-8', 0, 4)).toBe('%PDF');
    });
  });

  describe('Sharing & Revocation', () => {
    it('13.2 TEAM SHARING FLOW: member shares → leader views → member revokes → leader denied', async () => {
        const org = await createTestOrg();
        const team = await createTestTeam(org.id);
        const leader = await createTestUser({ name: 'Leader' });
        const member = await createTestUser({ name: 'Member' });
        await addTeamMember(team.id, leader.id, 'leader');
        await addTeamMember(team.id, member.id, 'member');
        
        // Member completes assessment
        await billingService.completePurchase((await billingService.initiatePurchase(member.id, member.email, { purchaseType: 'individual_assessment' })).id, 'tx');
        const run = await runService.startRun(member.id, { instrumentSlug: 'diagnostic' });
        await runService.submitBatchResponses(run.id, { responses: generateResponses({ safety: 3 }).map(r => ({ itemId: r.itemId, responseValue: r.value })) });
        await runService.completeRun(run.id);
        
        // Member shares with team
        const grant = await shareService.grantShare(member.id, { targetType: 'team', targetTeamId: team.id });
        
        // Leader generates/views member report
        const report = await reportService.generateReport({
            reportType: 'base_diagnostic',
            subjectUserId: member.id,
            viewerUserId: leader.id,
        });
        
        const fetched = await reportService.getReport(report.id, leader.id);
        expect(fetched).toBeDefined();
        
        // Member revokes
        await shareService.revokeShare(grant.id, member.id);
        
        // Leader denied
        await expect(reportService.getReport(report.id, leader.id)).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('13.8 EDGE: all minimum responses (all 1s) → report generates', async () => {
        const user = await createTestUser();
        await billingService.completePurchase((await billingService.initiatePurchase(user.id, user.email, { purchaseType: 'individual_assessment' })).id, 'tx');
        const run = await runService.startRun(user.id, { instrumentSlug: 'diagnostic' });
        const responses = Array.from({ length: 66 }, (_, i) => ({ itemId: `item-${i+1}`, responseValue: 1 }));
        await runService.submitBatchResponses(run.id, { responses });
        await runService.completeRun(run.id);
        
        const userReports = await reportService.getUserReports(user.id, user.id);
        expect(userReports).toHaveLength(1);
        expect(userReports[0].renderedPayload?.html).toContain('very_low');
    });
  });
});
