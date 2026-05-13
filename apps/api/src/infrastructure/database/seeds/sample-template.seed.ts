import { db } from '../connection';
import { reportTemplates } from '../../../domains/report/features/template/template.schema';
import { ReportTemplate } from '@dimensional/shared';

export async function seedTemplate() {
  console.log('Seeding sample report template...');
  
  const template: ReportTemplate = {
    id: 'base-report-standard',
    reportType: 'base',
    name: 'Base Report - Standard Template',
    version: 1,
    pageSize: { width: 210, height: 297 },
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
    pages: [
      {
        id: 'cover', label: 'Cover Page', gridColumns: '1fr', gridRows: '1fr 1fr', gap: 10,
        children: [
          { id: 'logo', type: 'image', src: 'https://placehold.co/200x100', alt: 'Logo', position: 'grid', opacity: 1, zIndex: 0, visible: true, objectFit: 'contain' } as any,
          { id: 'title', type: 'text', content: 'Assessment Report for {{subject_name}}', position: 'grid', font: { size: 24, weight: '700' } as any, opacity: 1, zIndex: 0, visible: true, textAlign: 'left' } as any,
        ]
      },
      {
        id: 'overview', label: 'Overview', gridColumns: '1fr', gridRows: 'auto', gap: 5,
        children: [
          { id: 'ov-title', type: 'text', content: 'Domain Overview', position: 'grid', font: { size: 18, weight: '600' } as any, opacity: 1, zIndex: 0, visible: true, textAlign: 'left' } as any,
          { id: 'ov-chart', type: 'chart', chartType: 'horizontal_bar', dataBinding: { source: 'domains', compareProfiles: false }, position: 'grid', opacity: 1, zIndex: 0, visible: true } as any,
        ]
      },
      {
        id: 'deep-dive', label: 'Domain Deep-dives', gridColumns: '1fr', gridRows: 'auto', gap: 5,
        children: [
          {
            id: 'domain-repeat', type: 'repeating_section', repeatOver: 'domains',
            gridColumns: '1fr', gap: 4,
            elements: [
              { id: 'dom-title', type: 'text', content: 'Domain: {{current_domain}}', position: 'grid', font: { size: 16, weight: '600' } as any, opacity: 1, zIndex: 0, visible: true, textAlign: 'left' } as any,
              { id: 'dom-ov', type: 'cms_block', sectionKey: 'domain_overview', domain: '{{current_domain}}', position: 'grid', opacity: 1, zIndex: 0, visible: true, textAlign: 'left' } as any,
              { id: 'felt-title', type: 'text', content: 'Felt State', position: 'grid', font: { weight: '600' } as any, opacity: 1, zIndex: 0, visible: true, textAlign: 'left' } as any,
              { id: 'dom-felt', type: 'cms_block', sectionKey: 'felt_state', domain: '{{current_domain}}', position: 'grid', opacity: 1, zIndex: 0, visible: true, textAlign: 'left' } as any,
            ]
          } as any
        ]
      }
    ]
  };

  await db.insert(reportTemplates).values({
    id: template.id,
    reportType: template.reportType,
    name: template.name,
    version: template.version,
    templateJson: template,
    isActive: true,
    isDefault: true,
  }).onConflictDoNothing();
  
  console.log('Sample report template seeded.');
}
