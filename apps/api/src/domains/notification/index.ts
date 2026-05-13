import { type DrizzleDb } from '@/infrastructure/database/connection';
import { type IEmailService } from '@/infrastructure/email/email.interface';
import { type IUserService } from '../user/user.service';
import { EmailTemplateRepository } from './email-template.repository';
import { NotificationService } from './notification.service';
import { type INotificationService } from './notification.types';

export function createNotificationServices(
  db: DrizzleDb,
  emailService: IEmailService,
  userService: IUserService | null,
): {
  notificationService: INotificationService;
  emailTemplateRepository: EmailTemplateRepository;
} {
  const emailTemplateRepository = new EmailTemplateRepository(db);
  const notificationService = new NotificationService(emailService, emailTemplateRepository, userService);
  
  return { notificationService, emailTemplateRepository };
}
