import { sql, eq, desc } from 'drizzle-orm';
import type { DrizzleDb } from '@/infrastructure/database/connection';
import { betterAuthUser, betterAuthOrganization } from '@/infrastructure/auth/better-auth-refs.schema';
import { reports } from '@/domains/report/report.schema';
import { userProfiles } from '@/domains/user/user.schema';
import { instrumentRuns } from '@/domains/instrument/features/run/run.schema';
import { purchases } from '@/domains/billing/billing.schema';

export interface AdminDashboardStats {
  totalUsers: number;
  usersTrend: number;
  totalAssessments: number;
  assessmentsTrend: number;
  totalOrgs: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export interface IAdminRepository {
  countUsers(): Promise<number>;
  countReports(): Promise<number>;
  listUsers(limit: number, offset: number): Promise<Array<{ 
    id: string; 
    displayName: string | null;
    email: string;
    role: string;
    createdAt: Date;
  }>>;
  exportUsersData(): Promise<any[]>;
  getDashboardStats(): Promise<AdminDashboardStats>;
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

  async listUsers(limit: number, offset: number): Promise<Array<{ 
    id: string; 
    displayName: string | null;
    email: string;
    role: string;
    createdAt: Date;
  }>> {
    const rows = await this.db
      .select({ 
        id: betterAuthUser.id, 
        email: betterAuthUser.email,
        role: betterAuthUser.role,
        createdAt: betterAuthUser.createdAt,
        displayName: userProfiles.displayName 
      })
      .from(betterAuthUser)
      .leftJoin(userProfiles, eq(userProfiles.userId, betterAuthUser.id))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(betterAuthUser.createdAt));
      
    return rows.map(r => ({ 
      id: r.id, 
      email: r.email,
      role: r.role || 'user',
      createdAt: r.createdAt,
      displayName: r.displayName ?? null 
    }));
  }

  async exportUsersData(): Promise<any[]> {
    // Basic join for export
    return this.db
      .select({
        id: betterAuthUser.id,
        email: betterAuthUser.email,
        displayName: userProfiles.displayName,
        profileType: userProfiles.profileType,
        createdAt: userProfiles.createdAt,
      })
      .from(betterAuthUser)
      .leftJoin(userProfiles, eq(userProfiles.userId, betterAuthUser.id));
  }

  async getDashboardStats(): Promise<AdminDashboardStats> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, usersTrend] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` }).from(betterAuthUser),
      this.db.select({ count: sql<number>`count(*)` }).from(betterAuthUser).where(sql`created_at > ${oneWeekAgo}`)
    ]);

    const [totalRuns, runsTrend] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` }).from(instrumentRuns).where(eq(instrumentRuns.status, 'completed')),
      this.db.select({ count: sql<number>`count(*)` }).from(instrumentRuns).where(sql`status = 'completed' AND completed_at > ${oneWeekAgo}`)
    ]);

    const totalOrgs = await this.db.select({ count: sql<number>`count(*)` }).from(betterAuthOrganization);

    const [totalRevenue, monthlyRevenue] = await Promise.all([
      this.db.select({ sum: sql<number>`sum(amount_cents)` }).from(purchases).where(eq(purchases.status, 'completed')),
      this.db.select({ sum: sql<number>`sum(amount_cents)` }).from(purchases).where(sql`status = 'completed' AND completed_at > ${oneMonthAgo}`)
    ]);

    return {
      totalUsers: Number(totalUsers[0].count),
      usersTrend: Number(usersTrend[0].count),
      totalAssessments: Number(totalRuns[0].count),
      assessmentsTrend: Number(runsTrend[0].count),
      totalOrgs: Number(totalOrgs[0].count),
      totalRevenue: Number(totalRevenue[0].sum || 0) / 100,
      monthlyRevenue: Number(monthlyRevenue[0].sum || 0) / 100,
    };
  }
}
