// domains/report/features/pdf/puppeteer-pdf.generator.ts
import puppeteer, { type Browser } from 'puppeteer';
import type { IPdfGenerator, PdfOptions } from './pdf.interface';

export class PuppeteerPdfGenerator implements IPdfGenerator {
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          // Limit memory usage in container
          '--js-flags=--max-old-space-size=256',
          '--single-process',
        ],
      });
    }
    return this.browser;
  }

  async generateFromHtml(html: string, options: PdfOptions): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      const pdfBuffer = await page.pdf({
        width: `${options.pageWidth}mm`,
        height: `${options.pageHeight}mm`,
        margin: options.margins ? {
          top: `${options.margins.top}mm`,
          right: `${options.margins.right}mm`,
          bottom: `${options.margins.bottom}mm`,
          left: `${options.margins.left}mm`,
        } : undefined,
        printBackground: options.printBackground,
        displayHeaderFooter: options.displayHeaderFooter,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  async shutdown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
