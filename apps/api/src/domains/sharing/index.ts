import { type DrizzleDb } from '@/infrastructure/database/connection';
import { ShareGrantRepository } from './share-grant.repository';
import { ShareService, type IShareService } from './share.service';
import { AccessEvaluator, type IAccessEvaluator } from './access-evaluator.service';
import { PeerShareRepository } from './peer-share.repository';
import { PeerShareService, type IPeerShareService } from './peer-share.service';
import { IReportRepository } from '../report/report.repository';
import { IScoringRepository } from '../scoring/scoring.repository';
import { IAuditService } from '../audit/audit.service';
import { ITeamMembershipRepository } from '../organization/features/team/team-membership.repository';
import { ICoachClientLinkRepository } from '../coaching/coach-client-link.repository';
import { ICertificationRepository } from '../coaching/certification.repository';
import { INotificationService } from '../notification/notification.types';
import { IUserService } from '../user/user.service';

export function createSharingServices(
  db: DrizzleDb,
  reportRepository: IReportRepository | null,
  scoringRepository: IScoringRepository,
  teamMembershipRepository: ITeamMembershipRepository,
  coachClientLinkRepository: ICoachClientLinkRepository,
  certificationRepository: ICertificationRepository,
  auditService: IAuditService,
  notificationService?: INotificationService,
  userService?: IUserService
): {
  shareService: IShareService;
  peerShareService: IPeerShareService;
  accessEvaluator: IAccessEvaluator;
  shareGrantRepository: ShareGrantRepository;
} {
  const shareGrantRepository = new ShareGrantRepository(db);

  const accessEvaluator = new AccessEvaluator(
    shareGrantRepository,
    teamMembershipRepository,
    coachClientLinkRepository,
    certificationRepository
  );

  const shareService = new ShareService(
    shareGrantRepository,
    reportRepository,
    scoringRepository,
    auditService,
    accessEvaluator,
    notificationService,
    userService
  );

  const peerShareRepository = new PeerShareRepository(db);
  const peerShareService = new PeerShareService(
    peerShareRepository,
    shareService,
    notificationService!,
    userService!
  );

  return { shareService, peerShareService, accessEvaluator, shareGrantRepository };
}
