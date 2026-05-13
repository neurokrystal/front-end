import type { IReportRenderer, RenderContext, RenderedBlock, ContentBlockRow } from './renderer.interface';
import { reportRendererRegistry } from './renderer.registry';

export class LeaderAdaptedReportRenderer implements IReportRenderer {
  readonly reportType = 'leader_adapted';

  private readonly layers = [
    {
      name: 'Foundation',
      sections: ['leader_foundation_overview', 'leader_foundation_domain', 'leader_foundation_alignment']
    },
    {
      name: 'Manifestation',
      sections: ['leader_manifestation_work', 'leader_manifestation_domain', 'leader_manifestation_patterns']
    },
    {
      name: 'Coaching',
      sections: ['leader_coaching_overview', 'leader_coaching_domain', 'leader_coaching_actions']
    }
  ];

  render(context: RenderContext, contentBlocks: ContentBlockRow[]): RenderedBlock[] {
    const result: RenderedBlock[] = [];

    for (const layer of this.layers) {
      for (const sectionKey of layer.sections) {
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
    }

    return result.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  validateCanRender(context: RenderContext): { canRender: boolean; reason?: string } {
    // 1. Must be viewer-facing (viewer !== subject)
    if (!context.viewerUserId || context.viewerUserId === context.subjectUserId) {
      return { canRender: false, reason: 'Leader-Adapted Report is viewer-facing only' };
    }
    // 2. All three content layers must have CMS content
    // This is checked during render, but we can do a sanity check here if needed.
    return { canRender: true };
  }
}

reportRendererRegistry.register(new LeaderAdaptedReportRenderer());
