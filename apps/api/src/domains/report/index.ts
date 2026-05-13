import { type DrizzleDb } from '@/infrastructure/database/connection';
import { ReportRepository } from './report.repository';
import { ReportService, type IReportService } from './report.service';
import { CmsRepository } from './features/cms/cms.repository';
import { CmsService, type ICmsService } from './features/cms/cms.service';
import { TemplateRepository } from './features/template/template.repository';
import { HtmlTemplateRenderer } from './features/renderer/html-template.renderer';
import { PuppeteerPdfGenerator } from './features/pdf/puppeteer-pdf.generator';
import { type IScoringService } from '../scoring/scoring.service';
import { type IAccessEvaluator } from '../sharing/access-evaluator.service';
import { type IAuditService } from '../audit/audit.service';
import { type IStorageService } from '@/infrastructure/storage/storage.interface';
import { type IUserService } from '../user/user.service';
import { type IBillingService } from '../billing/billing.service';
import { type IShareGrantRepository } from '../sharing/share-grant.repository';
import { type INotificationService } from '../notification/notification.types';

export function createReportServices(
  db: DrizzleDb, 
  scoringService: IScoringService,
  accessEvaluator: IAccessEvaluator,
  auditService: IAuditService,
  storageService: IStorageService,
  userService: IUserService,
  billingService: IBillingService,
  shareGrantRepository: IShareGrantRepository,
  notificationService?: INotificationService
): {
  reportService: IReportService;
  cmsService: ICmsService;
  reportRepository: ReportRepository;
  pdfGenerator: PuppeteerPdfGenerator;
} {
  const cmsRepository = new CmsRepository(db);
  const cmsService = new CmsService(cmsRepository);
  
  const reportRepository = new ReportRepository(db);
  const templateRepository = new TemplateRepository(db);
  const htmlRenderer = new HtmlTemplateRenderer();
  const pdfGenerator = new PuppeteerPdfGenerator();

  const reportService = new ReportService(
    reportRepository, 
    templateRepository,
    scoringService, 
    cmsService, 
    htmlRenderer,
    pdfGenerator,
    storageService,
    userService,
    accessEvaluator, 
    auditService,
    billingService,
    shareGrantRepository,
    notificationService
  );
  
  return { reportService, cmsService, reportRepository, pdfGenerator };
}
