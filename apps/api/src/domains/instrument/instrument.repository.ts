import { eq, and } from 'drizzle-orm';
import type { DrizzleDb } from '@/infrastructure/database/connection';
import { instruments, instrumentVersions, instrumentItems } from './instrument.schema';

export interface IInstrumentRepository {
  findById(id: string): Promise<typeof instruments.$inferSelect | null>;
  findActiveBySlug(slug: string): Promise<typeof instruments.$inferSelect | null>;
  findBySlug(slug: string): Promise<typeof instruments.$inferSelect | null>;
  findLatestVersion(instrumentId: string): Promise<typeof instrumentVersions.$inferSelect | null>;
  findVersionById(versionId: string): Promise<typeof instrumentVersions.$inferSelect | null>;
  findVersionWithItems(versionId: string): Promise<InstrumentVersionWithItems | null>;
}

export type InstrumentVersionWithItems = typeof instrumentVersions.$inferSelect & {
  items: (typeof instrumentItems.$inferSelect)[];
};

export class InstrumentRepository implements IInstrumentRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(id: string) {
    const result = await this.db.select().from(instruments).where(eq(instruments.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findActiveBySlug(slug: string) {
    const result = await this.db.select().from(instruments)
      .where(and(eq(instruments.slug, slug), eq(instruments.status, 'active')))
      .limit(1);
    return result[0] ?? null;
  }

  async findBySlug(slug: string) {
    const result = await this.db.select().from(instruments)
      .where(eq(instruments.slug, slug))
      .limit(1);
    return result[0] ?? null;
  }

  async findLatestVersion(instrumentId: string) {
    const result = await this.db.select()
      .from(instrumentVersions)
      .where(eq(instrumentVersions.instrumentId, instrumentId))
      .orderBy(instrumentVersions.versionNumber)
      .limit(1);
    return result[0] ?? null;
  }

  async findVersionById(versionId: string) {
    const result = await this.db.select()
      .from(instrumentVersions)
      .where(eq(instrumentVersions.id, versionId))
      .limit(1);
    return result[0] ?? null;
  }

  async findVersionWithItems(versionId: string): Promise<InstrumentVersionWithItems | null> {
    const version = await this.db.select()
      .from(instrumentVersions)
      .where(eq(instrumentVersions.id, versionId))
      .limit(1);
    
    if (version.length === 0) return null;

    const items = await this.db.select()
      .from(instrumentItems)
      .where(eq(instrumentItems.instrumentVersionId, versionId))
      .orderBy(instrumentItems.ordinal);

    return {
      ...version[0],
      items,
    };
  }
}
