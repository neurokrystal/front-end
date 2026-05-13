import { ProgrammeService, type IProgrammeService } from './programme.service';
import { INotificationService } from '../notification/notification.types';

export function createProgrammeServices(
  notificationService: INotificationService
): { programmeService: IProgrammeService } {
  const programmeService = new ProgrammeService(notificationService);
  return { programmeService };
}
