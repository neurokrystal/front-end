import { sql, eq, desc } from 'drizzle-orm';
import type { DrizzleDb } from '@/infrastructure/database/connection';
import { betterAuthUser, betterAuthOrganization } from '@/infrastructure/auth/better-auth-refs.schema';
import { reports } from '@/domains/report/report.schema';
import { userProfiles } from '@/domains/user/user.schema';
import { instrumentRuns } from '@/domains/instrument/features/run/run.schema';
import { purchases } from '@/domains/billing/billing.schema';

export interface AdminDashboardStats {
  totalUsers: number;
  totalUsersThisWeek: number;
  completedAssessments: number;
  completedAssessmentsThisWeek: number;
  activeOrganisations: number;
  totalRevenueCents: number;
  revenueThisMonthCents: number;
}

export interface IAdminRepository {
  countUsers(): Promise<number>;
  countReports(): Promise<number>;
  listUsers(limit: number, offset: number): Promise<Array<{ 
    id: string; 
    name: string;
    displayName: string | null;
    email: string;
    role: string;
    createdAt: Date;
    profileType: string;
    runCount: number;
    reportCount: number;
  }>>;
  exportUsersData(): Promise<any[]>;
  getDashboardStats(): Promise<AdminDashboardStats>;
  getAssessmentsTimeline(): Promise<Array<{ date: string; count: number }>>;
  getDomainDistribution(): Promise<any>;
}

export class AdminRepository implements IAdminRepository {
  constructor(private readonly db: DrizzleDb) {}

  async countUsers(): Promise<number> {
    const res = await this.db.select({ count: sql<number>`count(*)` }).from(betterAuthUser);
    return Number(res[0]?.count ?? 0);
  }

  async countReports(): Promise<number> {
    const res = await this.db.select({ count: sql<number>`count(*)` }).from(reports);
    return Number(res[0]?.count ?? 0);
  }

  async listUsers(limit: number, offset: number) {
    const runsSubquery = this.db.select({ 
      userId: instrumentRuns.userId, 
      runCount: sql<number>`count(*)`.as('run_count')
    })
    .from(instrumentRuns)
    .where(eq(instrumentRuns.status, 'completed'))
    .groupBy(instrumentRuns.userId)
    .as('runs');

    const reportsSubquery = this.db.select({ 
      subjectUserId: reports.subjectUserId, 
      reportCount: sql<number>`count(*)`.as('report_count')
    })
    .from(reports)
    .groupBy(reports.subjectUserId)
    .as('reports');

    const rows = await this.db
      .select({ 
        id: betterAuthUser.id, 
        name: betterAuthUser.name,
        email: betterAuthUser.email,
        role: betterAuthUser.role,
        createdAt: betterAuthUser.createdAt,
        displayName: userProfiles.displayName,
        profileType: userProfiles.profileType,
        runCount: sql<number>`COALESCE(${runsSubquery.runCount}, 0)`,
        reportCount: sql<number>`COALESCE(${reportsSubquery.reportCount}, 0)`,
      })
      .from(betterAuthUser)
      .leftJoin(userProfiles, eq(userProfiles.userId, betterAuthUser.id))
      .leftJoin(runsSubquery, eq(runsSubquery.userId, betterAuthUser.id))
      .leftJoin(reportsSubquery, eq(reportsSubquery.subjectUserId, betterAuthUser.id))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(betterAuthUser.createdAt));
      
    return rows.map(r => ({ 
      id: r.id, 
      name: r.name,
      email: r.email,
      role: r.role || 'user',
      createdAt: r.createdAt,
      displayName: r.displayName ?? r.name,
      profileType: r.profileType ?? 'none',
      runCount: Number(r.runCount),
      reportCount: Number(r.reportCount),
    }));
  }

  async exportUsersData(): Promise<any[]> {
    const rows = await this.db
      .select({
        id: betterAuthUser.id,
        name: betterAuthUser.name,
        email: betterAuthUser.email,
        role: betterAuthUser.role,
        displayName: userProfiles.displayName,
        profileType: userProfiles.profileType,
        createdAt: betterAuthUser.createdAt,
      })
      .from(betterAuthUser)
      .leftJoin(userProfiles, eq(userProfiles.userId, betterAuthUser.id));

    return rows.map(r => ({
      ...r,
      displayName: r.displayName ?? r.name,
      role: r.role || 'user',
      profileType: r.profileType ?? 'none',
    }));
  }

  async getDashboardStats(): Promise<AdminDashboardStats> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers, usersThisWeek] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` }).from(betterAuthUser),
      this.db.select({ count: sql<number>`count(*)` }).from(betterAuthUser).where(sql`created_at > ${oneWeekAgo}`)
    ]);

    const [completedAssessments, completedAssessmentsThisWeek] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` }).from(instrumentRuns).where(eq(instrumentRuns.status, 'completed')),
      this.db.select({ count: sql<number>`count(*)` }).from(instrumentRuns).where(sql`status = 'completed' AND completed_at > ${oneWeekAgo}`)
    ]);

    const activeOrganisations = await this.db.select({ count: sql<number>`count(*)` }).from(betterAuthOrganization);

    const [totalRevenue, revenueThisMonth] = await Promise.all([
      this.db.select({ sum: sql<number>`sum(amount_cents)` }).from(purchases).where(eq(purchases.status, 'completed')),
      this.db.select({ sum: sql<number>`sum(amount_cents)` }).from(purchases).where(sql`status = 'completed' AND created_at > ${new Date(now.getFullYear(), now.getMonth(), 1)}`)
    ]);

    return {
      totalUsers: Number(totalUsers[0].count),
      totalUsersThisWeek: Number(usersThisWeek[0].count),
      completedAssessments: Number(completedAssessments[0].count),
      completedAssessmentsThisWeek: Number(completedAssessmentsThisWeek[0].count),
      activeOrganisations: Number(activeOrganisations[0].count),
      totalRevenueCents: Number(totalRevenue[0].sum || 0),
      revenueThisMonthCents: Number(revenueThisMonth[0].sum || 0),
    };
  }

  async getAssessmentsTimeline(): Promise<Array<{ date: string; count: number }>> {
    const result = await this.db.execute(sql`
      SELECT DATE(completed_at) as date, COUNT(*) as count 
      FROM instrument_runs 
      WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(completed_at) ORDER BY date
    `);
    return result.rows.map((r: any) => ({
      date: new Date(r.date).toISOString().split('T')[0],
      count: Number(r.count)
    }));
  }

  async getDomainDistribution(): Promise<any> {
    // This is a bit more complex, we want counts per band per domain
    // We can do it in 3 queries or one with case statements
    const result = await this.db.execute(sql`
      SELECT 
        safety_band as band, 'safety' as domain, count(*) as count
      FROM scored_profiles GROUP BY safety_band
      UNION ALL
      SELECT 
        challenge_band as band, 'challenge' as domain, count(*) as count
      FROM scored_profiles GROUP BY challenge_band
      UNION ALL
      SELECT 
        play_band as band, 'play' as domain, count(*) as count
      FROM scored_profiles GROUP BY play_band
    `);
    return result.rows;
  }
}
