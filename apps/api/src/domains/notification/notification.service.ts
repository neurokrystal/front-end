import { INotificationService, NotificationEvent } from './notification.types';
import { IEmailService } from '@/infrastructure/email/email.interface';
import { IEmailTemplateRepository } from './email-template.repository';
import { IUserService } from '../user/user.service';

export class NotificationService implements INotificationService {
  private userService?: IUserService;

  constructor(
    private readonly emailService: IEmailService,
    private readonly templateRepository: IEmailTemplateRepository,
    userService: IUserService | null,
  ) {
    if (userService) {
      this.userService = userService;
    }
  }

  setUserService(userService: IUserService): void {
    this.userService = userService;
  }

  async notify(event: NotificationEvent): Promise<void> {
    const template = await this.templateRepository.findById(event.type);
    if (!template) {
      console.warn(`No email template found for event type: ${event.type}`);
      return;
    }

    let email: string | undefined;
    let name: string = 'User';

    // Extract recipient email and name from event or user service
    if ('email' in event) {
      email = (event as any).email;
    }
    
    if ('userId' in event && event.userId && this.userService) {
      const profile = await this.userService.getProfile(event.userId);
      const user = await this.userService.getUserById(event.userId);
      if (user) {
        email = email || user.email;
        name = event.type === 'user_registered' ? (event as any).name : (profile?.displayName || user.name || 'User');
      }
    }

    if (!email) {
      console.error(`Could not determine recipient email for event type: ${event.type}`);
      return;
    }

    const variables = {
      ...event,
      name,
    };

    const subject = this.resolveVariables(template.subject, variables);
    const bodyText = this.resolveVariables(template.body_text, variables);
    const bodyHtml = this.resolveVariables(template.body_html, variables);

    await this.emailService.sendEmail({
      to: email,
      subject,
      text: bodyText,
      html: bodyHtml,
    });
  }

  async sendSms(userId: string, message: string, channel: string = 'system'): Promise<void> {
    console.log(`Sending SMS to ${userId} via ${channel}: ${message}`);
    // Real implementation would use an SMS provider
  }

  private resolveVariables(content: string, variables: Record<string, any>): string {
    return content.replace(/\{\{(.+?)\}\}/g, (_, key) => {
      const value = variables[key.trim()];
      return value !== undefined ? String(value) : `{{${key}}}`;
    });
  }
}
