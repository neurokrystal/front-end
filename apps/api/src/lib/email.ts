import { env } from "../config.js";
import FormData from "form-data";
import Mailgun from "mailgun.js";
import Handlebars from "handlebars";

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailService {
  sendEmail(options: EmailOptions): Promise<void>;
  renderTemplate(template: string, data: any): string;
}

export class ConsoleEmailService implements EmailService {
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

  renderTemplate(template: string, data: any): string {
    const compiled = Handlebars.compile(template);
    return compiled(data);
  }
}

export class MailgunEmailService implements EmailService {
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

  renderTemplate(template: string, data: any): string {
    const compiled = Handlebars.compile(template);
    return compiled(data);
  }
}

export const emailService: EmailService = env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN 
  ? new MailgunEmailService() 
  : new ConsoleEmailService();
