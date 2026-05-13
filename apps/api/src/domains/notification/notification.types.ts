import { IUserService } from '../user/user.service';

export interface INotificationService {
  notify(event: NotificationEvent): Promise<void>;
  setUserService(userService: IUserService): void;
}

export type NotificationEvent =
  | { type: 'user_registered'; userId: string; email: string; name: string }
  | { type: 'assessment_completed'; userId: string; runId: string; instrumentName: string }
  | { type: 'report_ready'; userId: string; reportId: string; reportType: string; reportUrl?: string }
  | { type: 'share_granted'; subjectUserId: string; targetUserId: string; resourceTypes: string[]; subjectName: string }
  | { type: 'share_revoked'; targetUserId: string; subjectDisplayName: string }
  | { type: 'seat_invitation'; userId?: string; email: string; orgName: string; inviterName: string; signupUrl: string }
  | { type: 'purchase_completed'; userId: string; purchaseId: string; amount: number; productName: string; date: string }
  | { type: 'cert_expiry_warning'; coachUserId: string; expiresAt: string; daysRemaining: number; renewUrl: string }
  | { type: 'cert_lapsed'; coachUserId: string; coachName: string; clientCount: number }
  | { type: 'coach_revoked'; coachUserId: string; clientUserIds: string[] }
  | { type: 'deletion_requested'; userId: string; scheduledFor: string; cancelUrl: string }
  | { type: 'deletion_completed'; email: string }
  | { type: 'programme_enrolled'; userId: string; programmeName: string; startDate: string }
  | { type: 'programme_completed'; userId: string; programmeName: string };
