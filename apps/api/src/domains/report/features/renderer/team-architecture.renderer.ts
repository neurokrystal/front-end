import type { IReportRenderer, RenderContext, RenderedBlock, ContentBlockRow } from './renderer.interface';
import { reportRendererRegistry } from './renderer.registry';

export class TeamArchitectureReportRenderer implements IReportRenderer {
  readonly reportType = 'team_architecture';

  render(context: RenderContext, contentBlocks: ContentBlockRow[]): RenderedBlock[] {
    const result: RenderedBlock[] = [];

    // For team reports, we usually don't have a single "primary profile"
    // instead we describe the team's aggregate patterns.
    // However, the template system might expect some blocks.

    // 1. Team Overview Block
    const overview = contentBlocks.find(b => b.sectionKey === 'team_overview');
    if (overview) {
      result.push({
        sectionKey: 'team_overview',
        contentText: overview.contentText,
        displayOrder: 1,
      });
    }

    // 2. Aggregate visualisations are typically handled by the frontend
    // but we can provide interpretation blocks based on predominant patterns.
    
    return result;
  }

  validateCanRender(context: RenderContext): { canRender: boolean; reason?: string } {
    if (!context.teamProfiles || context.teamProfiles.length < 3) {
      return { canRender: false, reason: 'Team report requires at least 3 sharing members' };
    }
    return { canRender: true };
  }
}

reportRendererRegistry.register(new TeamArchitectureReportRenderer());
