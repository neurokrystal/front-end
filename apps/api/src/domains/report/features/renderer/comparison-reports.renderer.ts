import type { IReportRenderer, RenderContext, RenderedBlock, ContentBlockRow } from './renderer.interface';
import { reportRendererRegistry } from './renderer.registry';

export class ComparisonReportRenderer implements IReportRenderer {
  constructor(
    public readonly reportType: string,
    private readonly sectionKeys: string[]
  ) {}

  render(context: RenderContext, contentBlocks: ContentBlockRow[]): RenderedBlock[] {
    const result: RenderedBlock[] = [];
    if (!context.secondaryProfile) return result;

    for (const sectionKey of this.sectionKeys) {
      for (const domainA of context.primaryProfile.domains) {
        const domainB = context.secondaryProfile.domains.find(d => d.domain === domainA.domain);
        if (!domainB) continue;

        // Try to find a block matching both bands
        const block = contentBlocks.find(b =>
          b.sectionKey === sectionKey &&
          b.domain === domainA.domain &&
          b.scoreBand === domainA.band &&
          (b as any).secondaryScoreBand === domainB.band
        );

        if (block) {
          result.push({
            sectionKey,
            domain: domainA.domain,
            contentText: block.contentText,
            displayOrder: block.displayOrder,
          });
        }
      }
    }

    return result.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  validateCanRender(context: RenderContext): { canRender: boolean; reason?: string } {
    if (!context.secondaryProfile) {
      return { canRender: false, reason: 'Comparison report requires a secondary profile' };
    }
    return { canRender: true };
  }
}

// Register comparison renderers
reportRendererRegistry.register(new ComparisonReportRenderer('relational_compass', [
  'comparison_aligned', 'comparison_divergent', 'comparison_navigation', 'comparison_strengths'
]));

reportRendererRegistry.register(new ComparisonReportRenderer('collaboration_compass', [
  'comparison_aligned', 'comparison_divergent', 'comparison_navigation', 'comparison_strengths'
]));

reportRendererRegistry.register(new ComparisonReportRenderer('family_compass', [
  'comparison_aligned', 'comparison_divergent', 'comparison_navigation', 'comparison_strengths'
]));
