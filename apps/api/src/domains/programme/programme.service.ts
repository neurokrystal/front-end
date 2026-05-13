import { db } from '@/infrastructure/database/connection';
import { programmes, programmeEnrolments } from './programme.schema';
import { eq, and, or } from 'drizzle-orm';
import { CreateProgrammeInput, ProgrammeOutput, EnrolmentOutput } from './programme.dto';
import { INotificationService } from '../notification/notification.types';
import { teams } from '../organization/features/team/team.schema';
import { teamMemberships } from '../organization/features/team/team.schema';

export interface IProgrammeService {
  createProgramme(input: CreateProgrammeInput): Promise<ProgrammeOutput>;
  getProgramme(id: string): Promise<ProgrammeOutput>;
  listProgrammes(): Promise<ProgrammeOutput[]>;
  enrolUser(programmeId: string, userId: string): Promise<EnrolmentOutput>;
  enrolTeam(programmeId: string, teamId: string, leaderUserId: string): Promise<EnrolmentOutput[]>;
  getMyEnrolments(userId: string): Promise<EnrolmentOutput[]>;
  updateProgress(enrolmentId: string, userId: string, moduleId: string, status: string): Promise<void>;
  submitReflection(enrolmentId: string, userId: string, promptId: string, response: string): Promise<void>;
}

export class ProgrammeService implements IProgrammeService {
  constructor(
    private notificationService: INotificationService
  ) {}

  async createProgramme(input: CreateProgrammeInput): Promise<ProgrammeOutput> {
    const [inserted] = await db.insert(programmes).values({
      name: input.name,
      slug: input.slug,
      description: input.description,
      targetDomain: input.targetDomain,
      durationWeeks: input.durationWeeks,
      modulesJson: input.modules,
      status: 'active',
    }).returning();

    return this.mapToOutput(inserted);
  }

  async getProgramme(id: string): Promise<ProgrammeOutput> {
    const [found] = await db.select().from(programmes).where(eq(programmes.id, id));
    if (!found) throw new Error('Programme not found');
    return this.mapToOutput(found);
  }

  async listProgrammes(): Promise<ProgrammeOutput[]> {
    const results = await db.select().from(programmes).where(eq(programmes.status, 'active'));
    return results.map(r => this.mapToOutput(r));
  }

  async enrolUser(programmeId: string, userId: string): Promise<EnrolmentOutput> {
    const programme = await this.getProgramme(programmeId);
    
    // Check if already enrolled
    const [existing] = await db.select().from(programmeEnrolments).where(
      and(eq(programmeEnrolments.programmeId, programmeId), eq(programmeEnrolments.userId, userId))
    );
    if (existing) return this.mapToEnrolmentOutput(existing);

    const [enrolment] = await db.insert(programmeEnrolments).values({
      programmeId,
      userId,
      status: 'enrolled',
      progressJson: { modules: {}, reflections: {} },
    }).returning();

    await this.notificationService.notify({
      type: 'programme_enrolled',
      userId,
      programmeName: programme.name,
      startDate: new Date().toISOString(),
    });

    return this.mapToEnrolmentOutput(enrolment);
  }

  async enrolTeam(programmeId: string, teamId: string, leaderUserId: string): Promise<EnrolmentOutput[]> {
    const programme = await this.getProgramme(programmeId);
    
    // Check team exists and leader permission
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
    if (!team) throw new Error('Team not found');
    
    const membership = await db.select().from(teamMemberships).where(
      and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, leaderUserId), eq(teamMemberships.role, 'leader'))
    );
    if (membership.length === 0) throw new Error('Only team leader can enrol team');

    // Get all team members
    const members = await db.select().from(teamMemberships).where(eq(teamMemberships.teamId, teamId));
    
    const results: EnrolmentOutput[] = [];
    for (const member of members) {
      const enrolment = await this.enrolUser(programmeId, member.userId);
      results.push(enrolment);
    }

    return results;
  }

  async getMyEnrolments(userId: string): Promise<EnrolmentOutput[]> {
    const results = await db.select().from(programmeEnrolments).where(eq(programmeEnrolments.userId, userId));
    return results.map(r => this.mapToEnrolmentOutput(r));
  }

  async updateProgress(enrolmentId: string, userId: string, moduleId: string, status: string): Promise<void> {
    const [enrolment] = await db.select().from(programmeEnrolments).where(
      and(eq(programmeEnrolments.id, enrolmentId), eq(programmeEnrolments.userId, userId))
    );
    if (!enrolment) throw new Error('Enrolment not found');

    const progress = (enrolment.progressJson as any) || { modules: {}, reflections: {} };
    progress.modules[moduleId] = status;

    await db.update(programmeEnrolments).set({
      progressJson: progress,
      status: status === 'completed' ? 'in_progress' : enrolment.status, // Simple logic
      updatedAt: new Date(),
    }).where(eq(programmeEnrolments.id, enrolmentId));

    // Check if all modules complete
    const programme = await this.getProgramme(enrolment.programmeId);
    const allComplete = programme.modules?.every(m => progress.modules[m.id] === 'completed');
    if (allComplete) {
      await db.update(programmeEnrolments).set({
        status: 'completed',
        completedAt: new Date(),
      }).where(eq(programmeEnrolments.id, enrolmentId));

      await this.notificationService.notify({
        type: 'programme_completed',
        userId,
        programmeName: programme.name,
      });
    }
  }

  async submitReflection(enrolmentId: string, userId: string, promptId: string, response: string): Promise<void> {
    const [enrolment] = await db.select().from(programmeEnrolments).where(
      and(eq(programmeEnrolments.id, enrolmentId), eq(programmeEnrolments.userId, userId))
    );
    if (!enrolment) throw new Error('Enrolment not found');

    const progress = (enrolment.progressJson as any) || { modules: {}, reflections: {} };
    progress.reflections[promptId] = response;

    await db.update(programmeEnrolments).set({
      progressJson: progress,
      updatedAt: new Date(),
    }).where(eq(programmeEnrolments.id, enrolmentId));
  }

  private mapToOutput(row: any): ProgrammeOutput {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      targetDomain: row.targetDomain,
      status: row.status,
      durationWeeks: row.durationWeeks,
      modules: row.modulesJson as any,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapToEnrolmentOutput(row: any): EnrolmentOutput {
    return {
      id: row.id,
      programmeId: row.programmeId,
      userId: row.userId,
      teamId: row.teamId,
      status: row.status,
      startedAt: row.startedAt?.toISOString() || null,
      completedAt: row.completedAt?.toISOString() || null,
      progress: row.progressJson,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
