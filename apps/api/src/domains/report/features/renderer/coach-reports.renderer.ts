import type { IReportRenderer, RenderContext, RenderedBlock, ContentBlockRow } from './renderer.interface';
import { reportRendererRegistry } from './renderer.registry';

export class ClientFormulationRenderer implements IReportRenderer {
  readonly reportType = 'client_formulation';

  render(context: RenderContext, contentBlocks: ContentBlockRow[]): RenderedBlock[] {
    const result: RenderedBlock[] = [];
    const sectionKeys = ['clinical_formulation', 'coaching_angles', 'watch_outs', 'therapeutic_focus'];

    for (const sectionKey of sectionKeys) {
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
    // Only for coaches (or admin)
    if (context.viewerUserId === context.subjectUserId) {
      return { canRender: false, reason: 'Client Formulation is for coach viewing only' };
    }
    return { canRender: true };
  }
}

export class ProgressReportRenderer implements IReportRenderer {
  readonly reportType = 'progress';

  render(context: RenderContext, contentBlocks: ContentBlockRow[]): RenderedBlock[] {
    const result: RenderedBlock[] = [];
    
    // Progress reports are mostly data visualisations (longitudinal charts)
    // We can provide a general interpretation block
    const block = contentBlocks.find(b => b.sectionKey === 'progress_interpretation');
    if (block) {
      result.push({
        sectionKey: 'progress_interpretation',
        contentText: block.contentText,
        displayOrder: 1,
      });
    }

    return result;
  }

  validateCanRender(context: RenderContext): { canRender: boolean; reason?: string } {
    if (!context.longitudinalProfiles || context.longitudinalProfiles.length < 2) {
      return { canRender: false, reason: 'Progress report requires at least 2 completed assessments' };
    }
    return { canRender: true };
  }
}

reportRendererRegistry.register(new ClientFormulationRenderer());
reportRendererRegistry.register(new ProgressReportRenderer());
