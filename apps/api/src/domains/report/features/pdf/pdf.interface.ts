// domains/report/features/pdf/pdf.interface.ts
export interface IPdfGenerator {
  generateFromHtml(html: string, options: PdfOptions): Promise<Buffer>;
}

export interface PdfOptions {
  pageWidth: number;      // mm
  pageHeight: number;     // mm
  margins?: { top: number; right: number; bottom: number; left: number }; // mm
  printBackground: boolean;
  displayHeaderFooter: boolean;
}
