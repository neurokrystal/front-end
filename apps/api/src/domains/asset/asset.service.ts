import { and, desc, eq, ilike, like, or, sql } from 'drizzle-orm';
import type { DrizzleDb } from '@/infrastructure/database/connection';
import type { IStorageService } from '@/infrastructure/storage/storage.interface';
import { assets, type AssetRow } from './asset.schema';
import crypto from 'node:crypto';

export type AssetOutput = AssetRow;

export interface IAssetService {
  upload(file: Buffer, metadata: {
    name: string;
    description?: string;
    filename: string;
    mimeType: string;
    environment: 'production' | 'test';
    category?: string;
    uploadedBy: string;
  }): Promise<AssetOutput>;
  
  list(filters: {
    environment?: string;
    mimeType?: string;
    fileExtension?: string;
    category?: string;
    search?: string;    // Searches name, description, filename
    limit?: number;
    offset?: number;
  }): Promise<{ assets: AssetOutput[]; total: number }>;
  
  getById(id: string): Promise<AssetOutput | null>;
  update(id: string, updates: { name?: string; description?: string; category?: string }): Promise<AssetOutput>;
  delete(id: string): Promise<void>;  // Deletes from storage AND database
}

export class AssetService implements IAssetService {
  constructor(private db: DrizzleDb, private storage: IStorageService) {}

  async upload(file: Buffer, metadata: {
    name: string;
    description?: string;
    filename: string;
    mimeType: string;
    environment: 'production' | 'test';
    category?: string;
    uploadedBy: string;
  }): Promise<AssetOutput> {
    const { name, description, filename, mimeType, environment, category, uploadedBy } = metadata;
    const ext = this.getExtension(filename, mimeType);
    const base = this.stripExtension(filename);
    const uuid = crypto.randomUUID();
    const safeCategory = (category?.trim().toLowerCase() || 'general').replace(/[^a-z0-9-_]/g, '-');
    const safeBase = base.replace(/[^a-z0-9-_\.]/gi, '-');
    const storagePath = `${environment}/${safeCategory}/${safeBase}-${uuid}.${ext}`;

    const publicUrl = await this.storage.uploadFile(storagePath, file, mimeType, true);

    const toInsert = {
      name,
      description: description || null,
      filename,
      mimeType,
      fileExtension: ext,
      fileSizeBytes: file.length,
      environment,
      storagePath,
      publicUrl,
      category: category || null,
      uploadedBy,
    } as const;

    const [inserted] = await this.db.insert(assets).values(toInsert).returning();
    return inserted as AssetOutput;
  }

  async list(filters: {
    environment?: string;
    mimeType?: string;
    fileExtension?: string;
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ assets: AssetOutput[]; total: number }> {
    const { environment, mimeType, fileExtension, category, search } = filters;
    const limit = Math.min(Math.max(filters.limit ?? 24, 1), 200);
    const offset = Math.max(filters.offset ?? 0, 0);

    const conditions: any[] = [];
    if (environment) conditions.push(eq(assets.environment, environment));
    if (mimeType) {
      if (mimeType.endsWith('/*')) {
        const prefix = mimeType.slice(0, -1); // keep trailing '/'
        conditions.push((like as any)(assets.mimeType, `${prefix}%`));
      } else {
        conditions.push(eq(assets.mimeType, mimeType));
      }
    }
    if (fileExtension) conditions.push(eq(assets.fileExtension, fileExtension));
    if (category) conditions.push(eq(assets.category, category));
    if (search && search.trim()) {
      const likeVal = `%${search.trim()}%`;
      // Prefer ILIKE, fallback to LIKE for dialect typing
      conditions.push(or(
        (ilike as any)(assets.name, likeVal),
        (ilike as any)(assets.description, likeVal),
        (ilike as any)(assets.filename, likeVal),
      ));
    }

    const whereExpr = conditions.length ? and(...conditions as any) : undefined;

    const rows = await this.db
      .select()
      .from(assets)
      .where(whereExpr as any)
      .orderBy(desc(assets.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(assets)
      .where(whereExpr as any);

    return { assets: rows as AssetOutput[], total: Number(count) };
  }

  async getById(id: string): Promise<AssetOutput | null> {
    const [row] = await this.db.select().from(assets).where(eq(assets.id, id)).limit(1);
    return row || null;
  }

  async update(id: string, updates: { name?: string; description?: string; category?: string }): Promise<AssetOutput> {
    const safe: any = {};
    if (typeof updates.name === 'string') safe.name = updates.name;
    if (typeof updates.description !== 'undefined') safe.description = updates.description;
    if (typeof updates.category !== 'undefined') safe.category = updates.category;

    const [row] = await this.db.update(assets).set({ ...safe, updatedAt: sql`now()` }).where(eq(assets.id, id)).returning();
    return row as AssetOutput;
  }

  async delete(id: string): Promise<void> {
    const asset = await this.getById(id);
    if (!asset) return;
    // Best-effort: delete storage first, then DB
    try { await this.storage.deleteFile(asset.storagePath); } catch {}
    await this.db.delete(assets).where(eq(assets.id, id));
  }

  private stripExtension(filename: string): string {
    const idx = filename.lastIndexOf('.');
    return idx > 0 ? filename.substring(0, idx) : filename;
    }

  private getExtension(filename: string, mimeType: string): string {
    const idx = filename.lastIndexOf('.');
    if (idx > 0 && idx < filename.length - 1) {
      return filename.substring(idx + 1).toLowerCase();
    }
    // Fallback based on MIME type
    const map: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'image/webp': 'webp',
      'text/plain': 'txt',
      'application/pdf': 'pdf',
    };
    return (map[mimeType] || 'bin');
  }
}

export function createAssetServices(db: DrizzleDb, storage: IStorageService) {
  const assetService = new AssetService(db, storage);
  return { assetService };
}
