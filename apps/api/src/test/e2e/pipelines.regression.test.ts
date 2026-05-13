import { describe, it, expect, beforeEach } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser, createTestOrg, createTestTeam, addTeamMember } from '../helpers';
import { db } from '../setup';
import { instruments, instrumentVersions, instrumentItems, instrumentRuns } from '../../domains/instrument/instrument.schema';
import { reports, reportTemplates } from '../../domains/report/report.schema';
import { eq } from 'drizzle-orm';

describe('Category 13: E2E Pipelines', () => {
  let container = getTestContainer();

  beforeEach(async () => {
    await cleanTestData();
    
    await db.insert(reportTemplates).values({
      id: 'base-template',
      reportType: 'base',
      name: 'Base Template',
      version: 1,
      isDefault: true,
      templateJson: { version: 1, elements: [{ type: 'text', content: 'Base Content' }] } as any
    });
  });

  async function setupBaseInstrument() {
    const [inst] = await db.insert(instruments).values({
      slug: 'base-diag',
      name: 'Base Diagnostic',
      status: 'active'
    }).returning();

    const [version] = await db.insert(instrumentVersions).values({
      instrumentId: inst.id,
      versionNumber: 1,
      itemCount: 2,
      scoringStrategyKey: 'base-diag-v1',
      configJson: { 
        version: 1, instrumentSlug: 'base-diag', responseScale: { min: 1, max: 5, type: 'likert' },
        itemRules: [{ itemId: 'i1', domain: 'safety', scoreGroup: 'sg1' }, { itemId: 'i2', domain: 'safety', scoreGroup: 'sg1' }],
        scoreGroups: [{ key: 'sg1', label: 'SG1', domain: 'safety', category: 'feelings', aggregation: 'sum', rawScoreRange: { min: 2, max: 10 }, normalise: true }],
        domainBandThresholds: [{ domain: 'safety', bandThresholds: [{ band: 'balanced', min: 0, max: 101 }] }],
        dimensions: [], domains: [], alignment: { gapMethod: 'absolute_difference' }, consistency: { enabled: false }
      }
    }).returning();

    await db.insert(instrumentItems).values([
      { id: 'i1', instrumentVersionId: version.id, ordinal: 1, itemText: 'Q1', domainTag: 'safety' },
      { id: 'i2', instrumentVersionId: version.id, ordinal: 2, itemText: 'Q2', domainTag: 'safety' }
    ]);
  }

  it('13.1 INDIVIDUAL: user → purchase → run → responses → complete → profile → report', async () => {
    await setupBaseInstrument();
    const user = await createTestUser();
    
    // 1. Purchase
    const purchase = await container.billingService.initiatePurchase(user.id, user.email, { purchaseType: 'individual_assessment' });
    await container.billingService.completePurchase(purchase.id, 'ext-123');

    // 2. Run
    const run = await container.runService.startRun(user.id, { instrumentSlug: 'base-diag' });
    await container.runService.submitBatchResponses(run.id, {
      responses: [
        { itemId: 'i1', responseValue: 4 },
        { itemId: 'i2', responseValue: 5 }
      ]
    });
    await container.runService.completeRun(run.id);

    // 3. Profile
    const profiles = await container.scoringService.getUserProfiles(user.id);
    expect(profiles.length).toBe(1);
    const profile = profiles[0];

    // 4. Report
    const report = await container.reportService.generateReport({
      subjectUserId: user.id,
      reportType: 'base',
      viewerUserId: user.id,
      scoredProfileId: profile.id
    });

    expect(report.status).toBe('active');
    expect((report.renderedPayload as any).html).toBeDefined();
  });

  it('13.3 VIEWER ACCOUNT: A completes → B is viewer → A shares → B accesses → A revokes → B denied', async () => {
    await setupBaseInstrument();
    const userA = await createTestUser();
    const userB = await createTestUser();

    // A completes
    const purchase = await container.billingService.initiatePurchase(userA.id, userA.email, { purchaseType: 'individual_assessment' });
    await container.billingService.completePurchase(purchase.id, 'ext-123');
    const run = await container.runService.startRun(userA.id, { instrumentSlug: 'base-diag' });
    await container.runService.submitBatchResponses(run.id, { responses: [{ itemId: 'i1', responseValue: 4 }, { itemId: 'i2', responseValue: 4 }] });
    await container.runService.completeRun(run.id);
    const [profile] = await container.scoringService.getUserProfiles(userA.id);

    // A generates report for self
    const report = await container.reportService.generateReport({ subjectUserId: userA.id, reportType: 'base', viewerUserId: userA.id, scoredProfileId: profile.id });

    // B tries to access → denied
    await expect(container.reportService.getReport(report.id, userB.id)).rejects.toThrow();

    // A shares with B
    const grant = await container.shareService.grantShare(userA.id, { targetType: 'user', targetUserId: userB.id, resourceTypes: ['base'] });
    
    // B accesses → allowed
    const accessed = await container.reportService.getReport(report.id, userB.id);
    expect(accessed.id).toBe(report.id);

    // A revokes
    await container.shareService.revokeShare(grant.id, userA.id);

    // B tries to access → denied
    await expect(container.reportService.getReport(report.id, userB.id)).rejects.toThrow();
  });
});
