import type { IReportRenderer } from './renderer.interface';

class ReportRendererRegistry {
  private renderers = new Map<string, IReportRenderer>();

  register(renderer: IReportRenderer): void {
    this.renderers.set(renderer.reportType, renderer);
  }

  get(reportType: string): IReportRenderer {
    const renderer = this.renderers.get(reportType);
    if (!renderer) {
      throw new Error(`No renderer registered for report type: ${reportType}`);
    }
    return renderer;
  }
}

export const reportRendererRegistry = new ReportRendererRegistry();
