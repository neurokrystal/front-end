import { type DrizzleDb } from '@/infrastructure/database/connection';
import { CoachClientLinkRepository } from './coach-client-link.repository';
import { CertificationRepository } from './certification.repository';
import { CoachingFirmRepository } from './coaching-firm.repository';
import { CoachingService } from './coaching.service';
import { type ICoachingService } from './coaching.service';
import { IShareService } from '../sharing/share.service';
import { INotificationService } from '../notification/notification.types';
import { IUserService } from '../user/user.service';
import { IAuditService } from '../audit/audit.service';

export function createCoachingServices(
  db: DrizzleDb,
  shareService: IShareService | null,
  notificationService: INotificationService,
  userService: IUserService,
  auditService: IAuditService,
): {
  coachingService: ICoachingService;
  linkRepository: CoachClientLinkRepository;
  certificationRepository: CertificationRepository;
} {
  const linkRepository = new CoachClientLinkRepository(db);
  const certificationRepository = new CertificationRepository(db);
  const firmRepository = new CoachingFirmRepository(db);
  
  const coachingService = new CoachingService(
    linkRepository,
    certificationRepository,
    firmRepository,
    shareService,
    notificationService,
    userService,
    auditService
  );

  return { coachingService, linkRepository, certificationRepository };
}
