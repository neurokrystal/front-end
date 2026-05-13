import { eq, and, or } from 'drizzle-orm';
import { type DrizzleDb } from '@/infrastructure/database/connection';
import { certificationRecords } from './certification.schema';

export interface ICertificationRepository {
  create(data: typeof certificationRecords.$inferInsert): Promise<typeof certificationRecords.$inferSelect>;
  findById(id: string): Promise<typeof certificationRecords.$inferSelect | null>;
  findByCoach(coachUserId: string): Promise<typeof certificationRecords.$inferSelect | null>;
  update(id: string, data: Partial<typeof certificationRecords.$inferInsert>): Promise<void>;
  hasActiveCertification(coachUserId: string): Promise<boolean>;
}

export class CertificationRepository implements ICertificationRepository {
  constructor(private readonly db: DrizzleDb) {}

  async create(data: typeof certificationRecords.$inferInsert) {
    const results = await this.db.insert(certificationRecords).values(data).returning();
    return results[0];
  }

  async findById(id: string) {
    const results = await this.db.select().from(certificationRecords).where(eq(certificationRecords.id, id));
    return results[0] || null;
  }

  async findByCoach(coachUserId: string) {
    const results = await this.db.select().from(certificationRecords).where(eq(certificationRecords.coachUserId, coachUserId));
    return results[0] || null;
  }

  async update(id: string, data: Partial<typeof certificationRecords.$inferInsert>) {
    await this.db.update(certificationRecords).set(data).where(eq(certificationRecords.id, id));
  }

  async hasActiveCertification(coachUserId: string) {
    const cert = await this.findByCoach(coachUserId);
    if (!cert) return false;
    return cert.status === 'active';
  }
}
