import { type DrizzleDb } from '@/infrastructure/database/connection';
import { BillingRepository } from './billing.repository';
import { BillingService, type IBillingService } from './billing.service';
import { type IAuditService } from '../audit/audit.service';
import { type IPaymentProvider } from './payment/payment-provider.interface';
import { type INotificationService } from '../notification/notification.types';

export function createBillingServices(
  db: DrizzleDb, 
  auditService: IAuditService,
  paymentProvider: IPaymentProvider,
  notificationService?: INotificationService
): {
  billingService: IBillingService;
} {
  const billingRepository = new BillingRepository(db);
  const billingService = new BillingService(billingRepository, auditService, paymentProvider, notificationService);
  return { billingService };
}
