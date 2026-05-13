import Handlebars from "handlebars";
import type { IEmailService, EmailOptions } from "../email.interface";

export class ConsoleEmailService implements IEmailService {
  async sendEmail(options: EmailOptions): Promise<void> {
    console.log("--- EMAIL SENT (CONSOLE) ---");
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Text: ${options.text}`);
    if (options.html) {
      console.log(`HTML: ${options.html.substring(0, 100)}...`);
    }
    console.log("----------------------------");
  }

  renderTemplate(template: string, data: Record<string, unknown>): string {
    const compiled = Handlebars.compile(template);
    return compiled(data);
  }
}
