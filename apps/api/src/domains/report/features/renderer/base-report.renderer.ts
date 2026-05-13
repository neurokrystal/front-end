import type { IReportRenderer, RenderContext, RenderedBlock, ContentBlockRow } from './renderer.interface';
import { reportRendererRegistry } from './renderer.registry';

export class BaseReportRenderer implements IReportRenderer {
  readonly reportType = 'base';

  render(context: RenderContext, contentBlocks: ContentBlockRow[]): RenderedBlock[] {
    const result: RenderedBlock[] = [];

    // For each domain: select the content block matching the domain + band
    for (const domainScore of context.primaryProfile.domains) {
      // Domain overview block
      const overviewBlock = contentBlocks.find(b =>
        b.sectionKey === 'domain_overview' &&
        b.domain === domainScore.domain &&
        b.scoreBand === domainScore.band
      );
      if (overviewBlock) {
        result.push({
          sectionKey: 'domain_overview',
          domain: domainScore.domain,
          contentText: overviewBlock.contentText,
          displayOrder: overviewBlock.displayOrder,
        });
      }
    }

    // Dimension blocks
    for (const dimScore of context.primaryProfile.dimensions) {
      const dimBlock = contentBlocks.find(b =>
        b.sectionKey === 'dimension' &&
        b.dimension === dimScore.dimension &&
        b.scoreBand === dimScore.band
      );
      if (dimBlock) {
        result.push({
          sectionKey: 'dimension',
          dimension: dimScore.dimension,
          contentText: dimBlock.contentText,
          displayOrder: dimBlock.displayOrder,
        });
      }
    }

    return result.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  validateCanRender(context: RenderContext): { canRender: boolean; reason?: string } {
    if (context.viewerUserId && context.viewerUserId !== context.subjectUserId) {
      return { canRender: false, reason: 'Base report is subject-facing only' };
    }
    return { canRender: true };
  }
}

reportRendererRegistry.register(new BaseReportRenderer());
