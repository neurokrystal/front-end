export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface IEmailService {
  sendEmail(options: EmailOptions): Promise<void>;
  renderTemplate(template: string, data: Record<string, unknown>): string;
}
