import { describe, it, expect } from 'vitest';
import { HtmlTemplateRenderer } from './html-template.renderer';
import { ReportTemplate } from '@dimensional/shared';

const mockTemplate: ReportTemplate = {
  id: 'tmpl1',
  reportType: 'base',
  name: 'Test Template',
  version: 1,
  pageSize: { width: 210, height: 297 },
  margins: { top: 15, right: 15, bottom: 15, left: 15 },
  pages: [
    {
      id: 'pg1',
      label: 'Page 1',
      gridColumns: '1fr',
      gridRows: 'auto',
      gap: 4,
      children: [
        {
          id: 'el1',
          type: 'text',
          content: 'Hello {{subject_name}}! Your safety band is {{domain.safety.band}} and self raw score is {{dimension.self.rawScore}}.',
          position: 'grid',
          opacity: 1,
          zIndex: 0,
          visible: true,
          textAlign: 'left',
        } as any,
        {
          id: 'el2',
          type: 'text',
          content: 'Align: {{alignment.safety.severity}}',
          position: 'grid',
          opacity: 1,
          zIndex: 0,
          visible: true,
          textAlign: 'left',
        } as any
      ]
    }
  ]
};

const mockProfile = {
  domains: [
    { domain: 'safety', band: 'balanced', rawScore: 3.5, feltScore: 3.4, expressedScore: 3.6 },
  ],
  dimensions: [
    { dimension: 'self', domain: 'safety', band: 'balanced', rawScore: 3.8 },
  ],
  alignments: [
    { domain: 'safety', direction: 'aligned', severity: 'aligned', gapMagnitude: 0.2 },
  ]
};

describe('C5: Template Expression Resolver', () => {
  it('should resolve all tokens correctly', () => {
    const renderer = new HtmlTemplateRenderer();
    const html = renderer.render({
      template: mockTemplate,
      profile: mockProfile as any,
      cmsBlocks: [],
      subjectName: 'Alistair',
      reportDate: '2024-05-20',
    });

    expect(html).toContain('Hello Alistair!');
    expect(html).toContain('safety band is balanced');
    expect(html).toContain('self raw score is 3.8');
    expect(html).toContain('Align: aligned');
  });
});
