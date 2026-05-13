import type { IReportRenderer, RenderContext, RenderedBlock, ContentBlockRow } from './renderer.interface';
import { reportRendererRegistry } from './renderer.registry';

export class SecondaryReportRenderer implements IReportRenderer {
  constructor(
    public readonly reportType: string,
    private readonly sectionKeys: string[]
  ) {}

  render(context: RenderContext, contentBlocks: ContentBlockRow[]): RenderedBlock[] {
    const result: RenderedBlock[] = [];

    for (const sectionKey of this.sectionKeys) {
      for (const domainScore of context.primaryProfile.domains) {
        const block = contentBlocks.find(b =>
          b.sectionKey === sectionKey &&
          b.domain === domainScore.domain &&
          b.scoreBand === domainScore.band
        );
        if (block) {
          result.push({
            sectionKey,
            domain: domainScore.domain,
            contentText: block.contentText,
            displayOrder: block.displayOrder,
          });
        }
      }
    }

    return result.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  validateCanRender(context: RenderContext): { canRender: boolean; reason?: string } {
    // Secondary reports are usually subject-facing
    if (context.viewerUserId && context.viewerUserId !== context.subjectUserId) {
      return { canRender: false, reason: 'This report is subject-facing only' };
    }
    return { canRender: true };
  }
}

// Register all secondary report renderers
reportRendererRegistry.register(new SecondaryReportRenderer('professional_self', [
  'professional_overview', 'work_strengths', 'work_vulnerabilities', 'professional_alignment'
]));

reportRendererRegistry.register(new SecondaryReportRenderer('under_pressure', [
  'pressure_overview', 'coping_patterns', 'stress_response', 'resilience_profile'
]));

reportRendererRegistry.register(new SecondaryReportRenderer('relationship_patterns', [
  'relational_overview', 'attachment_style', 'conflict_patterns', 'intimacy_profile'
]));

reportRendererRegistry.register(new SecondaryReportRenderer('career_alignment', [
  'career_overview', 'role_fit', 'growth_edges', 'career_risks'
]));

reportRendererRegistry.register(new SecondaryReportRenderer('parenting_patterns', [
  'parenting_overview', 'parenting_strengths', 'parenting_blindspots', 'child_impact'
]));

reportRendererRegistry.register(new SecondaryReportRenderer('wellbeing', [
  'wellbeing_overview', 'energy_patterns', 'recovery_profile', 'sustainability'
]));
