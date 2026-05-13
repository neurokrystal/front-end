import { eq, or, sql } from 'drizzle-orm';
import { type DrizzleDb } from '@/infrastructure/database/connection';
import { IDataDeletionRepository } from './data-deletion.repository';
import { INotificationService } from '../notification/notification.types';
import { IAuditService, AUDIT_ACTIONS } from '../audit/audit.service';
import { PLATFORM_CONSTANTS } from '@dimensional/shared';
import { DeletionRequestOutput } from './user.dto';
import { NotFoundError, DomainError } from '@/shared/errors/domain-error';
import { deletionRequests, userProfiles } from './user.schema';
import { shareGrants } from '../sharing/share-grant.schema';
import { reports } from '../report/report.schema';
import { scoredProfiles } from '../scoring/scoring.schema';
import { instrumentRuns, instrumentResponses } from '../instrument/features/run/run.schema';
import { teamMemberships } from '../organization/features/team/team.schema';
import { peerShares } from '../sharing/peer-share.schema';
import { programmeEnrolments } from '../programme/programme.schema';
import { auditLogs } from '../audit/audit.schema';
import { betterAuthUser, betterAuthSession, betterAuthAccount } from '@/infrastructure/auth/better-auth-refs.schema';
import crypto from 'crypto';

export interface DeletionReport {
  userId: string;
  deletedAt: string;
  counts: {
    shareGrants: number;
    reports: number;
    scoredProfiles: number;
    instrumentRuns: number;
    instrumentResponses: number;
    teamMemberships: number;
    peerShares: number;
    programmeEnrolments: number;
  };
  auditLogsAnonymised: number;
}

export interface IDataDeletionService {
  requestDeletion(userId: string): Promise<DeletionRequestOutput>;
  cancelDeletion(requestIdOrUserId: string, userId?: string): Promise<void>;
  executeDeletion(requestIdOrUserId: string, adminUserId?: string): Promise<DeletionReport>;
  getQueuedRequests(): Promise<any[]>;
  processScheduledDeletions(): Promise<number>;
}

export class DataDeletionService implements IDataDeletionService {
  constructor(
    private readonly db: DrizzleDb,
    private readonly deletionRepository: IDataDeletionRepository,
    private readonly notificationService: INotificationService,
    private readonly auditService: IAuditService,
  ) {}

  async requestDeletion(userId: string): Promise<DeletionRequestOutput> {
    const existing = await this.deletionRepository.findByUserId(userId);
    if (existing && existing.status === 'pending') {
      throw new DomainError('Deletion request already pending', 'ALREADY_PENDING', 400);
    }

    const retentionDays = PLATFORM_CONSTANTS.DELETION_RETENTION_DAYS || 30;
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + retentionDays);

    const request = await this.deletionRepository.create({
      userId,
      scheduledFor,
      status: 'pending',
    });

    await this.notificationService.notify({
      type: 'deletion_requested',
      userId,
      scheduledFor: scheduledFor.toISOString(),
      cancelUrl: `${process.env.BETTER_AUTH_URL}/settings/profile`, // Placeholder
    });

    return request as DeletionRequestOutput;
  }

  async cancelDeletion(requestIdOrUserId: string, userId?: string) {
    let request = await this.deletionRepository.findById(requestIdOrUserId);
    if (!request) {
      // Try by userId
      request = await this.deletionRepository.findByUserId(requestIdOrUserId);
    }
    
    if (!request || request.status !== 'pending') {
      throw new NotFoundError('Pending deletion request', requestIdOrUserId);
    }

    if (userId && request.userId !== userId) {
        throw new DomainError('Unauthorized to cancel this request', 'FORBIDDEN', 403);
    }

    await this.deletionRepository.update(request.id, {
      status: 'cancelled',
    });
  }

  async executeDeletion(requestIdOrUserId: string, adminUserId?: string): Promise<DeletionReport> {
    let request = await this.deletionRepository.findById(requestIdOrUserId);
    if (!request) {
        // Try by userId
        request = await this.deletionRepository.findByUserId(requestIdOrUserId);
    }

    if (!request || request.status !== 'pending') {
      throw new NotFoundError('Pending deletion request', requestIdOrUserId);
    }

    const targetUserId = request.userId;
    const user = await this.db.select().from(betterAuthUser).where(eq(betterAuthUser.id, targetUserId)).then(r => r[0]);
    if (!user) throw new NotFoundError('User', targetUserId);

    console.log(`Executing deletion for user ${targetUserId}...`);

    const counts = {
      shareGrants: 0,
      reports: 0,
      scoredProfiles: 0,
      instrumentRuns: 0,
      instrumentResponses: 0,
      teamMemberships: 0,
      peerShares: 0,
      programmeEnrolments: 0,
    };

    // 1. Revoke all share grants where user is subject OR target
    const sg = await this.db.delete(shareGrants).where(or(eq(shareGrants.subjectUserId, targetUserId), eq(shareGrants.targetUserId, targetUserId))).returning();
    counts.shareGrants = sg.length;

    // 2. Delete all reports where user is subject
    const r = await this.db.delete(reports).where(eq(reports.subjectUserId, targetUserId)).returning();
    counts.reports = r.length;

    // 3. Delete all scored profiles
    const sp = await this.db.delete(scoredProfiles).where(eq(scoredProfiles.userId, targetUserId)).returning();
    counts.scoredProfiles = sp.length;

    // 4. Delete all instrument responses and instrument runs
    const runs = await this.db.select().from(instrumentRuns).where(eq(instrumentRuns.userId, targetUserId));
    for (const run of runs) {
      const resp = await this.db.delete(instrumentResponses).where(eq(instrumentResponses.runId, run.id)).returning();
      counts.instrumentResponses += resp.length;
    }
    const ir = await this.db.delete(instrumentRuns).where(eq(instrumentRuns.userId, targetUserId)).returning();
    counts.instrumentRuns = ir.length;

    // 5. Delete all team memberships
    const tm = await this.db.delete(teamMemberships).where(eq(teamMemberships.userId, targetUserId)).returning();
    counts.teamMemberships = tm.length;

    // 6. Delete all peer shares
    const ps = await this.db.delete(peerShares).where(or(eq(peerShares.initiatorUserId, targetUserId), eq(peerShares.recipientUserId, targetUserId))).returning();
    counts.peerShares = ps.length;

    // 7. Delete all programme enrolments
    const pe = await this.db.delete(programmeEnrolments).where(eq(programmeEnrolments.userId, targetUserId)).returning();
    counts.programmeEnrolments = pe.length;

    // 8. Delete user profile
    await this.db.delete(userProfiles).where(eq(userProfiles.userId, targetUserId));

    // 9. Anonymise audit logs
    const userHash = crypto.createHash('sha256').update(targetUserId).digest('hex');
    const logs = await this.db.update(auditLogs)
      .set({ 
        actorUserId: sql`CASE WHEN actor_user_id = ${targetUserId} THEN ${userHash} ELSE actor_user_id END`,
        subjectUserId: sql`CASE WHEN subject_user_id = ${targetUserId} THEN ${userHash} ELSE subject_user_id END`,
      })
      .where(or(eq(auditLogs.actorUserId, targetUserId), eq(auditLogs.subjectUserId, targetUserId)))
      .returning();
    
    // 10. Delete Better-Auth user record (user, session, account tables)
    await this.db.delete(betterAuthSession).where(eq(betterAuthSession.userId, targetUserId));
    await this.db.delete(betterAuthAccount).where(eq(betterAuthAccount.userId, targetUserId));
    await this.db.delete(betterAuthUser).where(eq(betterAuthUser.id, targetUserId));

    // 11. Send deletion confirmation email (before DB delete if we used email from DB, but we already got it)
    await this.notificationService.notify({
      type: 'deletion_completed',
      email: user.email,
    });

    const report: DeletionReport = {
      userId: targetUserId,
      deletedAt: new Date().toISOString(),
      counts,
      auditLogsAnonymised: logs.length,
    };

    // 12. Finalize request
    await this.deletionRepository.update(request.id, {
      status: 'executed',
      executedAt: new Date(),
      executedBy: adminUserId,
      deletionReport: report,
    });

    return report;
  }

  async getQueuedRequests() {
    return this.deletionRepository.findAllPending();
  }

  async processScheduledDeletions(): Promise<number> {
    const pending = await this.deletionRepository.findPendingScheduledBefore(new Date());
    let count = 0;
    for (const request of pending) {
      try {
        await this.executeDeletion(request.id, 'system');
        count++;
      } catch (e) {
        console.error(`Failed to execute deletion for request ${request.id}:`, e);
      }
    }
    return count;
  }
}
