import type { ScoredProfilePayload } from '../../../scoring/scoring.types';
import type { reportContentBlocks } from '../cms/cms.schema';

export interface RenderContext {
  reportType: string;
  subjectUserId: string;
  viewerUserId: string | null;            // null = subject viewing their own
  primaryProfile: ScoredProfilePayload;
  secondaryProfile?: ScoredProfilePayload;  // For comparison reports
  teamProfiles?: ScoredProfilePayload[];    // For team aggregate reports
  longitudinalProfiles?: ScoredProfilePayload[]; // For progress reports (multiple profiles for same user)
}

export interface RenderedBlock {
  sectionKey: string;
  domain?: string;
  dimension?: string;
  contentText: string;
  displayOrder: number;
}

export type ContentBlockRow = typeof reportContentBlocks.$inferSelect;

export interface IReportRenderer {
  readonly reportType: string;
  render(context: RenderContext, contentBlocks: ContentBlockRow[]): RenderedBlock[];
  validateCanRender(context: RenderContext): { canRender: boolean; reason?: string };
}
