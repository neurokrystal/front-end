import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser } from '../helpers';
import { db } from '../setup';
import { instruments, instrumentVersions, instrumentItems } from '../../domains/instrument/instrument.schema';
import { reportTemplates } from '../../domains/report/features/template/template.schema';
import { reportContentBlocks } from '../../domains/report/features/cms/cms.schema';
import { MOCK_SCORING_CONFIG, generateResponses } from '../fixtures';

import { scoringStrategyRegistry } from '../../domains/scoring/strategies/scoring-strategy.registry';

describe('Category 7: End-to-End Pipeline Tests', () => {
  const container = getTestContainer();
  const { runService, scoringService, reportService, shareService, billingService, auditService } = container;

  beforeEach(async () => {
    await cleanTestData();
    scoringStrategyRegistry.clear();
    
    // 1. Seed Instrument
    const instrumentId = crypto.randomUUID();
    await db.insert(instruments).values({
      id: instrumentId,
      name: 'Base Diagnostic',
      slug: 'base-diagnostic',
      status: 'active',
    });

    const versionId = crypto.randomUUID();
    // Scoring config needs to be in DB or mocked in scoring service
    // For this E2E, we'll mock the config retrieval if needed, 
    // but ConfigDrivenScoringStrategy usually gets it from the container.
    
    await db.insert(instrumentVersions).values({
      id: versionId,
      instrumentId,
      versionNumber: 1,
      itemCount: 66,
      scoringStrategyKey: 'base-diagnostic-v1',
      configJson: MOCK_SCORING_CONFIG as any,
    });

    const items = generateResponses({ safety: 3, challenge: 3, play: 3 });
    await db.insert(instrumentItems).values(items.map((it, idx) => ({
      id: it.itemId,
      instrumentVersionId: versionId,
      ordinal: idx + 1,
      itemText: `Item ${idx + 1}`,
      domainTag: it.domain,
      dimensionTag: it.dimension,
      stateTag: it.state,
    })));

    // 2. Seed Template
    const templateId = crypto.randomUUID();
    await db.insert(reportTemplates).values({
      id: templateId,
      reportType: 'base',
      name: 'Base Report',
      version: 1,
      templateJson: {
        id: templateId,
        pageSize: { width: 210, height: 297 },
        margins: { top: 15, right: 15, bottom: 15, left: 15 },
        pages: [{ id: 'p1', children: [{ id: 't1', type: 'text', content: '{{subject_name}}' }] }]
      } as any,
      isActive: true,
      isDefault: true,
    });
    
    // 3. Mocks
    vi.spyOn(container.pdfGenerator, 'generateFromHtml').mockResolvedValue(Buffer.from('%PDF-mock'));
  });

  it('7.1 INDIVIDUAL USER FULL FLOW', async () => {
    // 1. Create user
    const user = await createTestUser();
    
    // 2. Create purchase (mock payment)
    const purchase = await billingService.initiatePurchase(user.id, user.email, { purchaseType: 'individual_assessment' });
    await billingService.completePurchase(purchase.id, 'ext_payment_id');
    
    // 3. Start instrument run
    const runStatus = await runService.startRun(user.id, { instrumentSlug: 'base-diagnostic' });
    const runDetail = await runService.getRunDetail(runStatus.id);
    
    // 4. Submit all 66 responses
    const responses = generateResponses({ safety: 4, challenge: 3, play: 2 });
    await runService.submitBatchResponses(runStatus.id, {
        responses: responses.map(r => ({ itemId: r.itemId, responseValue: r.value }))
    });
    
    // 5. Complete run -> triggers scoring
    await runService.completeRun(runStatus.id);
    
    // 6. Verify scored profile exists
    const profiles = await scoringService.getProfilesForUser(user.id);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].safetyBand).toBe('almost_balanced'); // ~3.77 is almost_balanced
    
    // 7. Verify base report was generated
    const userReports = await reportService.getReportsForUser(user.id, user.id);
    expect(userReports).toHaveLength(1);
    expect(userReports[0].reportType).toBe('base');
    
    // 8. Fetch report detail
    const reportDetail = await reportService.getReport(userReports[0].id, user.id);
    expect(reportDetail.renderedPayload!.html).toContain(user.name);
    
    // 9. Generate PDF
    const pdf = await reportService.getReportPdf(userReports[0].id, user.id);
    expect(pdf.length).toBeGreaterThan(0);
    
    // 10. Verify audit trail
    const logs = await auditService.getLogs({ subjectUserId: user.id });
    const actions = logs.map(l => l.actionType);
    expect(actions).toContain('run.started');
    expect(actions).toContain('run.completed');
    expect(actions).toContain('profile.scored');
    expect(actions).toContain('report.generated');
  });
});
