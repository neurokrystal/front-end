import { type DrizzleDb } from '@/infrastructure/database/connection';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import type { IUserService } from './user.service';
import { DataDeletionRepository } from './data-deletion.repository';
import { DataDeletionService, type IDataDeletionService } from './data-deletion.service';
import { INotificationService } from '../notification/notification.types';
import { IAuditService } from '../audit/audit.service';

export function createUserServices(
  db: DrizzleDb,
  notificationService?: INotificationService,
  auditService?: IAuditService
): {
  userService: IUserService;
  deletionService: IDataDeletionService;
} {
  const userRepository = new UserRepository(db);
  const userService = new UserService(userRepository);

  const deletionRepository = new DataDeletionRepository(db);
  const deletionService = new DataDeletionService(
    db,
    deletionRepository,
    notificationService!,
    auditService!
  );

  return { userService, deletionService };
}
