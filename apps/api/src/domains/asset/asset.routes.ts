import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/infrastructure/auth/auth-middleware';

export default async function assetAdminRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.addHook('preHandler', requirePlatformAdmin);

  // List assets
  fastify.get('/', {
    schema: {
      querystring: z.object({
        environment: z.string().optional(),
        mimeType: z.string().optional(),
        fileExtension: z.string().optional(),
        category: z.string().optional(),
        search: z.string().optional(),
        limit: z.coerce.number().min(1).max(200).optional(),
        offset: z.coerce.number().min(0).optional(),
      })
    }
  }, async (request) => {
    const { environment, mimeType, fileExtension, category, search, limit, offset } = request.query as any;
    const result = await fastify.container.assetService.list({ environment, mimeType, fileExtension, category, search, limit, offset });
    // Normalize dates to ISO strings
    return {
      assets: result.assets.map(a => ({ ...a, createdAt: (a as any).createdAt?.toISOString?.(), updatedAt: (a as any).updatedAt?.toISOString?.() })),
      total: result.total,
    };
  });

  // Quick search for picker
  fastify.get('/search', {
    schema: {
      querystring: z.object({
        q: z.string().optional(),
        environment: z.string().optional(),
        mimeType: z.string().optional(),
        limit: z.coerce.number().min(1).max(100).optional().default(20),
      })
    }
  }, async (request) => {
    const { q, environment, mimeType, limit } = request.query as any;
    const { assets } = await fastify.container.assetService.list({ environment, mimeType, search: q, limit, offset: 0 });
    return assets.map(a => ({ ...a, createdAt: (a as any).createdAt?.toISOString?.(), updatedAt: (a as any).updatedAt?.toISOString?.() }));
  });

  // Get single asset
  fastify.get('/:id', {
    schema: { params: z.object({ id: z.string().uuid() }) }
  }, async (request, reply) => {
    const { id } = request.params as any;
    const asset = await fastify.container.assetService.getById(id);
    if (!asset) return reply.status(404).send({ code: 'NOT_FOUND' });
    return { ...asset, createdAt: (asset as any).createdAt?.toISOString?.(), updatedAt: (asset as any).updatedAt?.toISOString?.() };
  });

  // Upload asset (multipart)
  fastify.post('/upload', {}, async (request, reply) => {
    const data = await (request as any).file();
    if (!data) return reply.status(400).send({ code: 'NO_FILE' });
    const fields = (data as any).fields || {};

    const name = (fields.name as any)?.value || data.filename;
    const description = (fields.description as any)?.value as string | undefined;
    const environment = (fields.environment as any)?.value || 'production';
    const category = (fields.category as any)?.value as string | undefined;

    const buffer = await data.toBuffer();
    const filename = data.filename as string;
    const mimeType = data.mimetype as string;

    const result = await fastify.container.assetService.upload(buffer, {
      name,
      description,
      filename,
      mimeType,
      environment,
      category,
      uploadedBy: (request as any).session?.user?.id,
    });
    return reply.status(201).send({ ...result, createdAt: (result as any).createdAt?.toISOString?.(), updatedAt: (result as any).updatedAt?.toISOString?.() });
  });

  // Update metadata
  fastify.put('/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
      })
    }
  }, async (request) => {
    const { id } = request.params as any;
    const updates = request.body as any;
    const updated = await fastify.container.assetService.update(id, updates);
    return { ...updated, createdAt: (updated as any).createdAt?.toISOString?.(), updatedAt: (updated as any).updatedAt?.toISOString?.() };
  });

  // Delete asset (storage + DB)
  fastify.delete('/:id', {
    schema: { params: z.object({ id: z.string().uuid() }) }
  }, async (request, reply) => {
    const { id } = request.params as any;
    await fastify.container.assetService.delete(id);
    return reply.status(204).send();
  });
}
