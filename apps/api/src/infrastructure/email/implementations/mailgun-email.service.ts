import { env } from "@/infrastructure/config";
import FormData from "form-data";
import Mailgun from "mailgun.js";
import Handlebars from "handlebars";
import type { IEmailService, EmailOptions } from "../email.interface";

export class MailgunEmailService implements IEmailService {
  private mg;

  constructor() {
    const mailgun = new Mailgun(FormData as any);
    this.mg = mailgun.client({
      username: "api",
      key: env.MAILGUN_API_KEY,
      url: env.MAILGUN_URL || "https://api.mailgun.net",
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.mg.messages.create(env.MAILGUN_DOMAIN, {
        from: `Dimensional <noreply@${env.MAILGUN_DOMAIN}>`,
        to: [options.to],
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
    } catch (error) {
      console.error("Mailgun Error:", error);
      throw error;
    }
  }

  renderTemplate(template: string, data: Record<string, unknown>): string {
    const compiled = Handlebars.compile(template);
    return compiled(data);
  }
}
