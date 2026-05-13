import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requirePlatformAdmin } from '@/infrastructure/auth/auth-middleware';
import { ReportTemplateSchema } from '@dimensional/shared';
import { reportTemplates } from './template.schema';

export default async function templateRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requirePlatformAdmin);

  // List all templates
  fastify.get('/', {
    schema: {
      querystring: z.object({ reportType: z.string().optional() }),
    }
  }, async (request, reply) => {
    const { reportType } = request.query as { reportType?: string };
    // TODO: Gated by admin role
    const query = fastify.container.db.select().from(reportTemplates);
    if (reportType) {
      query.where(eq(reportTemplates.reportType, reportType));
    }
    return query;
  });

  // Get template by ID
  fastify.get('/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await fastify.container.db.select()
      .from(reportTemplates)
      .where(eq(reportTemplates.id, id))
      .limit(1);
    return result[0];
  });

  // Create template
  fastify.post('/', {
    schema: {
      body: z.object({
        reportType: z.string(),
        name: z.string(),
        templateJson: ReportTemplateSchema,
      }),
    }
  }, async (request, reply) => {
    const body = request.body as any;
    const result = await fastify.container.db.insert(reportTemplates)
      .values({
        ...body,
        version: 1,
      })
      .returning();
    return result[0];
  });

  // Update template
  fastify.put('/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        name: z.string().optional(),
        templateJson: ReportTemplateSchema.optional(),
        isActive: z.boolean().optional(),
        isDefault: z.boolean().optional(),
      }),
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const result = await fastify.container.db.update(reportTemplates)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(reportTemplates.id, id))
      .returning();
    return result[0];
  });
}
