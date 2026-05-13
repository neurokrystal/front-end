import { eq } from 'drizzle-orm';
import { type DrizzleDb } from '@/infrastructure/database/connection';
import { emailTemplates } from './email-template.schema';

export interface IEmailTemplateRepository {
  findById(id: string): Promise<typeof emailTemplates.$inferSelect | null>;
  findAll(): Promise<Array<typeof emailTemplates.$inferSelect>>;
  update(id: string, data: Partial<Omit<typeof emailTemplates.$inferInsert, 'id'>>): Promise<void>;
  create(data: typeof emailTemplates.$inferInsert): Promise<void>;
}

export class EmailTemplateRepository implements IEmailTemplateRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(id: string) {
    const results = await this.db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return results[0] || null;
  }

  async findAll() {
    return this.db.select().from(emailTemplates);
  }

  async update(id: string, data: Partial<Omit<typeof emailTemplates.$inferInsert, 'id'>>) {
    await this.db.update(emailTemplates).set({ ...data, updated_at: new Date() }).where(eq(emailTemplates.id, id));
  }

  async create(data: typeof emailTemplates.$inferInsert) {
    await this.db.insert(emailTemplates).values(data);
  }
}
