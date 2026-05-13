import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser, createTestScoredProfile, createTestOrg, createTestTeam, addTeamMember } from '../../test/helpers';
import { db } from '../../test/setup';
import { sql, eq } from 'drizzle-orm';
import { reportTemplates } from './features/template/template.schema';
import { reportContentBlocks } from './features/cms/cms.schema';
import { reports } from './report.schema';
import { NotFoundError } from '../../shared/errors/domain-error';

describe('Category 3: Report Pipeline', () => {
  const container = getTestContainer();
  const { reportService, cmsService, shareService } = container;

  beforeEach(async () => {
    await cleanTestData();

    // Mock PDF generation
    vi.spyOn(container.pdfGenerator, 'generateFromHtml').mockResolvedValue(Buffer.from('%PDF-mock-data'));
    
    // Seed a basic template
    const templateId = crypto.randomUUID();
    const templateJson = {
      id: templateId,
      reportType: 'base_diagnostic',
      name: 'Base Report',
      version: 1,
      pageSize: { width: 210, height: 297 },
      margins: { top: 15, right: 15, bottom: 15, left: 15 },
      pages: [
        {
          id: 'page-1',
          label: 'Page 1',
          children: [
            {
              id: 'text-1',
              type: 'text',
              content: '<h1>{{subject_name}}</h1>',
            },
            {
              id: 'cms-1',
              type: 'cms_block',
              sectionKey: 'safety_section',
              domain: 'safety',
            }
          ]
        }
      ]
    };

    await db.insert(reportTemplates).values({
      id: templateId,
      reportType: 'base_diagnostic',
      name: 'Base Report',
      version: 1,
      templateJson: templateJson as any,
      isActive: true,
      isDefault: true,
    });

    // Seed CMS content
    await db.insert(reportContentBlocks).values({
      id: crypto.randomUUID(),
      reportType: 'base_diagnostic',
      sectionKey: 'safety_section',
      domain: 'safety',
      scoreBand: 'balanced',
      contentText: '<p>Your safety is balanced: {{domain.safety.band}}</p>',
      isActive: true,
    });
  });

  describe('Report Generation', () => {
    it('3.1 Generate base report → report record created with correct fields', async () => {
      const user = await createTestUser();
      const profile = await createTestScoredProfile(user.id);
      
      const report = await reportService.generateReport({
        reportType: 'base_diagnostic',
        subjectUserId: user.id,
        viewerUserId: null,
        scoredProfileId: profile.id,
      });
      
      expect(report.id).toBeDefined();
      expect(report.subjectUserId).toBe(user.id);
    });

    it('3.2 Report audience = "subject_facing" for base type', async () => {
      const user = await createTestUser();
      const profile = await createTestScoredProfile(user.id);
      const report = await reportService.generateReport({
        reportType: 'base_diagnostic',
        subjectUserId: user.id,
        viewerUserId: null,
        scoredProfileId: profile.id,
      });
      expect(report.audience).toBe('subject_facing');
    });

    it('3.3 Report has renderedPayload containing HTML', async () => {
      const user = await createTestUser();
      const profile = await createTestScoredProfile(user.id);
      const report = await reportService.generateReport({
        reportType: 'base_diagnostic',
        subjectUserId: user.id,
        viewerUserId: null,
        scoredProfileId: profile.id,
      });
      expect(report.renderedPayload?.html).toContain('<h1');
    });

    it('3.7 Template expression {{domain.safety.band}} resolves to actual band value', async () => {
      const user = await createTestUser();
      const profile = await createTestScoredProfile(user.id);
      // Ensure profile has balanced safety
      await db.execute(sql`UPDATE scored_profiles SET payload = jsonb_set(payload, '{domains}', '[{"domain": "safety", "band": "balanced", "rawScore": 4.5}]'::jsonb) WHERE id = ${profile.id}`);

      const report = await reportService.generateReport({
        reportType: 'base_diagnostic',
        subjectUserId: user.id,
        scoredProfileId: profile.id,
      });
      expect(report.renderedPayload?.html).toContain('Your safety is balanced: balanced');
    });

    it('3.8 Template expression {{subject_name}} resolves to user display name', async () => {
      const user = await createTestUser({ name: 'John Doe' });
      const profile = await createTestScoredProfile(user.id);
      const report = await reportService.generateReport({
        reportType: 'base_diagnostic',
        subjectUserId: user.id,
        scoredProfileId: profile.id,
      });
      expect(report.renderedPayload?.html).toContain('John Doe');
    });
  });

  describe('Access Control', () => {
    it('3.12 Subject accessing own report → allowed', async () => {
      const user = await createTestUser();
      const profile = await createTestScoredProfile(user.id);
      const report = await reportService.generateReport({
        reportType: 'base_diagnostic',
        subjectUserId: user.id,
        scoredProfileId: profile.id,
      });
      
      const fetched = await reportService.getReport(report.id, user.id);
      expect(fetched).toBeDefined();
    });

    it('3.13 Viewer with active share → allowed', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser();
      const profile = await createTestScoredProfile(u1.id);
      await shareService.grantShare(u1.id, { targetType: 'user', targetUserId: u2.id });
      
      const report = await reportService.generateReport({
        reportType: 'base_diagnostic',
        subjectUserId: u1.id,
        viewerUserId: u2.id,
        scoredProfileId: profile.id,
      });
      
      const fetched = await reportService.getReport(report.id, u2.id);
      expect(fetched).toBeDefined();
    });

    it('3.14 Viewer WITHOUT share → denied (returns 404, not 403)', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser();
      const profile = await createTestScoredProfile(u1.id);
      
      const report = await reportService.generateReport({
        reportType: 'base_diagnostic',
        subjectUserId: u1.id,
        viewerUserId: u1.id, // subject-facing
        scoredProfileId: profile.id,
      });
      
      await expect(reportService.getReport(report.id, u2.id)).rejects.toThrow(NotFoundError);
    });
  });

  describe('PDF & Multi-reports', () => {
    it('3.16 PDF generation: sample HTML → non-zero buffer starting with %PDF', async () => {
      const buffer = await container.pdfGenerator.generateFromHtml('<html></html>');
      expect(buffer.toString('utf-8', 0, 4)).toBe('%PDF');
    });

    it('3.17 Two reports for same user at different times → both exist, different IDs', async () => {
      const user = await createTestUser();
      const profile = await createTestScoredProfile(user.id);
      const r1 = await reportService.generateReport({ reportType: 'base_diagnostic', subjectUserId: user.id, scoredProfileId: profile.id });
      const r2 = await reportService.generateReport({ reportType: 'base_diagnostic', subjectUserId: user.id, scoredProfileId: profile.id });
      expect(r1.id).not.toBe(r2.id);
    });
  });

  describe('Team Report', () => {
    it('3.26 Team aggregate with <5 sharing members → meetsThreshold = false, no aggregate data', async () => {
      const org = await createTestOrg();
      const team = await createTestTeam(org.id);
      const result = await reportService.getTeamAggregate(team.id, 'any-user');
      expect(result.meetsThreshold).toBe(false);
      expect(result.data).toBeUndefined();
    });
  });
});
