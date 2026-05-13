import { describe, it, expect, beforeEach } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser, createTestScoredProfile, createTestPurchase } from '../../test/helpers';
import { db } from '../../test/setup';
import { reportContentBlocks } from './features/cms/cms.schema';
import { reportTemplates } from './features/template/template.schema';
import { reports } from './report.schema';
import { eq, sql } from 'drizzle-orm';
import { AccessDeniedError } from '@/shared/errors/domain-error';

describe('Category 3: Report Pipeline', () => {
  let container = getTestContainer();
  let reportService = container.reportService;
  let pdfGenerator = container.pdfGenerator;

  beforeEach(async () => {
    await cleanTestData();
    
    // Seed a basic template
    await db.insert(reportTemplates).values({
      id: 'base-template',
      reportType: 'base',
      name: 'Base Template',
      version: 1,
      isDefault: true,
      templateJson: {
        version: 1,
        pageSize: { width: 210, height: 297 },
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        elements: [
          { type: 'text', content: 'Hello {{subject_name}}!' },
          { type: 'cms_block', sectionKey: 'overview' },
          { type: 'cms_block', sectionKey: 'domain_detail', repeatOver: 'domains' }
        ]
      } as any
    });

    // Seed CMS blocks
    await db.insert(reportContentBlocks).values([
      {
        id: crypto.randomUUID(),
        reportType: 'base',
        sectionKey: 'overview',
        contentText: 'General Overview',
        isActive: true
      },
      {
        id: crypto.randomUUID(),
        reportType: 'base',
        sectionKey: 'domain_detail',
        domain: 'safety',
        scoreBand: 'balanced',
        contentText: 'Safety is Balanced',
        isActive: true
      },
      {
        id: crypto.randomUUID(),
        reportType: 'base',
        sectionKey: 'domain_detail',
        domain: 'challenge',
        scoreBand: 'low',
        contentText: 'Challenge is Low',
        isActive: true
      },
       {
        id: crypto.randomUUID(),
        reportType: 'base',
        sectionKey: 'domain_detail',
        domain: 'play',
        scoreBand: 'balanced',
        contentText: 'Play is Balanced',
        isActive: true
      }
    ]);
  });

  it('3.1 Generate base report → created with correct fields', async () => {
    const user = await createTestUser({ name: 'John Doe' });
    const { id: profileId } = await createTestScoredProfile(user.id);
    
    const report = await reportService.generateReport({
      subjectUserId: user.id,
      reportType: 'base',
      viewerUserId: user.id,
      scoredProfileId: profileId
    });

    expect(report.reportType).toBe('base');
    expect(report.subjectUserId).toBe(user.id);
    expect(report.primaryScoredProfileId).toBe(profileId);
  });

  it('3.2 Audience = "subject_facing" for base type', async () => {
    const user = await createTestUser();
    const { id: profileId } = await createTestScoredProfile(user.id);
    const report = await reportService.generateReport({
      subjectUserId: user.id,
      reportType: 'base',
      viewerUserId: user.id,
      scoredProfileId: profileId
    });
    expect(report.audience).toBe('subject_facing');
  });

  it('3.3 renderedPayload contains HTML', async () => {
    const user = await createTestUser({ name: 'Alice' });
    const { id: profileId } = await createTestScoredProfile(user.id);
    const report = await reportService.generateReport({
      subjectUserId: user.id,
      reportType: 'base',
      viewerUserId: user.id,
      scoredProfileId: profileId
    });
    
    const html = (report.renderedPayload as any).html;
    expect(html).toContain('Alice');
    expect(html).toContain('General Overview');
  });

  it('3.4 CMS block selected by reportType + sectionKey + domain + scoreBand → correct', async () => {
     const user = await createTestUser();
     // Balanced Safety, Low Challenge
     const { id: profileId } = await createTestScoredProfile(user.id, {
        safetyBand: 'balanced',
        challengeBand: 'low',
        playBand: 'balanced'
     });
     
     const report = await reportService.generateReport({
        subjectUserId: user.id,
        reportType: 'base',
        viewerUserId: user.id,
        scoredProfileId: profileId
     });

     const html = (report.renderedPayload as any).html;
     expect(html).toContain('Safety is Balanced');
     expect(html).toContain('Challenge is Low');
  });

  it('3.5 Missing CMS block → graceful (no crash)', async () => {
    await db.insert(reportTemplates).values({
      id: 'missing-block-template',
      reportType: 'base',
      name: 'Missing Block',
      version: 1,
      isDefault: false,
      templateJson: {
        version: 1,
        pageSize: { width: 210, height: 297 },
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        elements: [{ type: 'cms_block', sectionKey: 'non-existent' }]
      } as any
    });

    const user = await createTestUser();
    const { id: profileId } = await createTestScoredProfile(user.id);
    
    const report = await reportService.generateReport({
      subjectUserId: user.id,
      reportType: 'base',
      viewerUserId: user.id,
      scoredProfileId: profileId,
      // Note: generateReport uses findDefaultForReportType, so I'll make it default temporarily
    });

    await db.update(reportTemplates).set({ isDefault: true }).where(eq(reportTemplates.id, 'missing-block-template'));
    await db.update(reportTemplates).set({ isDefault: false }).where(eq(reportTemplates.id, 'base-template'));

    const report2 = await reportService.generateReport({
      subjectUserId: user.id,
      reportType: 'base',
      viewerUserId: user.id,
      scoredProfileId: profileId,
    });

    expect(report2).toBeDefined();
    expect((report2.renderedPayload as any).html).toBeDefined();
  });

  it('3.12 Subject accessing own report → allowed', async () => {
    const user = await createTestUser();
    const { id: profileId } = await createTestScoredProfile(user.id);
    const report = await reportService.generateReport({ subjectUserId: user.id, reportType: 'base', viewerUserId: user.id, scoredProfileId: profileId });
    
    const accessed = await reportService.getReport(report.id, user.id);
    expect(accessed.id).toBe(report.id);
  });

  it('3.16 PDF generation: sample HTML → non-zero buffer starting with %PDF', async () => {
    // pdfGenerator.generateFromHtml is used in reportService
    const html = '<html><body><h1>Test</h1></body></html>';
    const buffer = await pdfGenerator.generateFromHtml(html, {
       pageWidth: 210, pageHeight: 297, margins: { top: 20, right: 20, bottom: 20, left: 20 }, printBackground: true, displayHeaderFooter: false
    });
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });

  it('3.7 Template expression {{domain.safety.band}} resolves correctly', async () => {
    await db.insert(reportTemplates).values({
      id: 'expr-template',
      reportType: 'base',
      name: 'Expr Template',
      version: 1,
      isDefault: false,
      templateJson: {
        version: 1,
        pageSize: { width: 210, height: 297 },
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        elements: [{ type: 'text', content: 'Safety is {{domain.safety.band}}' }]
      } as any
    });
    await db.update(reportTemplates).set({ isDefault: true }).where(eq(reportTemplates.id, 'expr-template'));
    await db.update(reportTemplates).set({ isDefault: false }).where(eq(reportTemplates.id, 'base-template'));

    const user = await createTestUser();
    const { id: profileId } = await createTestScoredProfile(user.id, { safetyBand: 'very_low' });
    
    const report = await reportService.generateReport({
      subjectUserId: user.id,
      reportType: 'base',
      viewerUserId: user.id,
      scoredProfileId: profileId,
    });

    expect((report.renderedPayload as any).html).toContain('Safety is very_low');
  });

  it('3.13 Viewer with share → allowed', async () => {
    const subject = await createTestUser();
    const viewer = await createTestUser();
    const { id: profileId } = await createTestScoredProfile(subject.id);
    
    const report = await reportService.generateReport({ subjectUserId: subject.id, reportType: 'base', viewerUserId: subject.id, scoredProfileId: profileId });
    
    await container.shareService.grantShare(subject.id, { targetType: 'user', targetUserId: viewer.id, resourceTypes: ['base'] });
    
    const accessed = await reportService.getReport(report.id, viewer.id);
    expect(accessed.id).toBe(report.id);
  });

  it('3.14 Viewer without share → denied (AccessDeniedError)', async () => {
    const subject = await createTestUser();
    const viewer = await createTestUser();
    const { id: profileId } = await createTestScoredProfile(subject.id);
    const report = await reportService.generateReport({ subjectUserId: subject.id, reportType: 'base', viewerUserId: subject.id, scoredProfileId: profileId });
    
    await expect(reportService.getReport(report.id, viewer.id)).rejects.toThrow(AccessDeniedError);
  });

  it('3.20 Cannot generate secondary without purchase → error', async () => {
    const user = await createTestUser();
    const { id: profileId } = await createTestScoredProfile(user.id);
    
    await expect(reportService.generateReport({
      subjectUserId: user.id,
      reportType: 'professional_self',
      viewerUserId: user.id,
      scoredProfileId: profileId
    })).rejects.toThrow();
  });
});
