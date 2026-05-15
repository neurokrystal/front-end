export interface IPdfService {
  generateReportPdf(reportData: any): Promise<Buffer>;
}

export class MockPdfService implements IPdfService {
  async generateReportPdf(reportData: any): Promise<Buffer> {
    // Return a dummy PDF buffer
    return Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Dimension Report) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
  }
}
