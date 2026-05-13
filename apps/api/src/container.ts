import { db } from '@/infrastructure/database/connection';
import { env } from '@/infrastructure/config';
import { DigitalOceanStorageService } from '@/infrastructure/storage/do-storage.service';
import { MockStorageService } from '@/infrastructure/storage/mock-storage.service';
import { MailgunEmailService } from '@/infrastructure/email/implementations/mailgun-email.service';
import { ConsoleEmailService } from '@/infrastructure/email/implementations/console-email.service';
import { createUserServices } from '@/domains/user';
import { createOrganizationServices } from '@/domains/organization';
import { createInstrumentServices } from '@/domains/instrument';
import { createScoringServices } from '@/domains/scoring';
import { createReportServices } from '@/domains/report';
import { createAuditServices } from '@/domains/audit';
import { createSharingServices } from '@/domains/sharing';
import { createCoachingServices } from '@/domains/coaching';
import { TeamMembershipRepository } from '@/domains/organization/features/team/team-membership.repository';
import { createBillingServices } from '@/domains/billing';
import { createAdminServices } from '@/domains/admin';
import { createCommercialServices } from '@/domains/commercial';
import { createNotificationServices } from '@/domains/notification';
import { createProgrammeServices } from '@/domains/programme';
import { StripePaymentProvider } from '@/domains/billing/payment/stripe-payment.provider';
import { MockPaymentProvider } from '@/domains/billing/payment/mock-payment.provider';
import type { IPaymentProvider } from '@/domains/billing/payment/payment-provider.interface';

export function createContainer() {
  const storageService = env.DO_SPACES_KEY && env.DO_SPACES_SECRET 
    ? new DigitalOceanStorageService() 
    : new MockStorageService();

  const emailService = env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN 
    ? new MailgunEmailService() 
    : new ConsoleEmailService();

  const paymentProvider: IPaymentProvider = env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET
    ? new StripePaymentProvider(env.STRIPE_SECRET_KEY, env.STRIPE_WEBHOOK_SECRET)
    : new MockPaymentProvider();

  // 1. Foundation Services
  const { auditService } = createAuditServices(db);
  const { notificationService, emailTemplateRepository } = createNotificationServices(db, emailService, null);
  const { userService, deletionService } = createUserServices(db, notificationService, auditService);
  
  // Resolve circular: notificationService -> userService
  notificationService.setUserService(userService);
  
  // 2. Core Domains
  const { billingService } = createBillingServices(db, auditService, paymentProvider, notificationService);
  const { instrumentService, runService, runRepository, instrumentRepository } = createInstrumentServices(db, billingService, auditService, notificationService);
  const { scoringService, scoringRepository } = createScoringServices(db, runRepository, auditService, instrumentRepository);
  const { adminService } = createAdminServices(db, billingService, scoringRepository, auditService);
  const { commercialService } = createCommercialServices(db, billingService, auditService);
  
  const { programmeService } = createProgrammeServices(notificationService);
  
  // Resolve circular: billingService -> commercialService
  billingService.setCommercialService(commercialService);
  
  const { teamService } = createOrganizationServices(db);
  const teamMembershipRepository = new TeamMembershipRepository(db);

  // 3. Coaching & Sharing (Circular Loop)
  const { coachingService, linkRepository, certificationRepository } = createCoachingServices(
    db,
    null, // shareService injected later
    notificationService,
    userService,
    auditService
  );

  const { shareService, accessEvaluator, shareGrantRepository, peerShareService } = createSharingServices(
    db,
    null, // reportRepository injected later
    scoringRepository,
    teamMembershipRepository,
    linkRepository,
    certificationRepository,
    auditService,
    notificationService,
    userService
  );

  // 4. Reports (Needs AccessEvaluator)
  const { reportService, cmsService, reportRepository, pdfGenerator } = createReportServices(
    db, 
    scoringService, 
    accessEvaluator, 
    auditService, 
    storageService, 
    userService,
    billingService,
    shareGrantRepository,
    notificationService
  );

  // 5. Resolve Late-Bound Dependencies (Phased Initialization)
  coachingService.setShareService(shareService);
  shareService.setReportRepository(reportRepository);
  scoringService.setAccessEvaluator(accessEvaluator);
  runService.setScoringService(scoringService);
  runService.setReportService(reportService);
  adminService.setReportService(reportService);

  return {
    storageService,
    emailService,
    paymentProvider,
    auditService,
    shareService,
    peerShareService,
    shareGrantRepository,
    accessEvaluator,
    billingService,
    adminService,
    userService,
    deletionService,
    teamService,
    coachingService,
    instrumentService,
    runService,
    scoringService,
    reportService,
    commercialService,
    programmeService,
    cmsService,
    pdfGenerator,
    notificationService,
    emailTemplateRepository,
    db,
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
