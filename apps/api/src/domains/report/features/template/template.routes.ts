import { FastifyInstance } from 'fastify';
// IMPORTANT: Avoid Zod runtime validation here due to cross-package instance issues observed at runtime
// (fastify-type-provider-zod + multiple zod copies under pnpm). We'll do light manual parsing instead.
import { eq } from 'drizzle-orm';
import { requirePlatformAdmin } from '@/infrastructure/auth/auth-middleware';
// Note: We intentionally avoid importing the complex ReportTemplateSchema here due to
// potential cross-package Zod instance mismatches in runtime validation.
import { reportTemplates } from './template.schema';

export default async function templateRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requirePlatformAdmin);

  // List all templates
  fastify.get('/', async (request, reply) => {
    const q = (request.query ?? {}) as Record<string, unknown>;
    const reportType = typeof q.reportType === 'string' && q.reportType.length > 0 ? q.reportType : undefined;
    // TODO: Gated by admin role
    // Build Drizzle query and ensure we await execution before returning
    let query = fastify.container.db.select().from(reportTemplates);
    if (reportType) {
      query = query.where(eq(reportTemplates.reportType, reportType));
    }
    const rows = await query;
    return rows;
  });

  // NOTE: GET '/:id' handler is defined later with proper 404 handling

  // Create template
  fastify.post('/', async (request, reply) => {
    const body = (request.body ?? {}) as any;
    // Minimal guards to avoid inserting invalid rows. Frontend does stricter validation.
    if (!body || typeof body !== 'object') {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'Invalid body' });
    }
    const { reportType, name, templateJson } = body;
    if (typeof reportType !== 'string' || !reportType) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'reportType is required' });
    }
    if (typeof name !== 'string' || !name) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'name is required' });
    }
    if (templateJson == null) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'templateJson is required' });
    }

    const result = await fastify.container.db.insert(reportTemplates)
      .values({
        reportType,
        name,
        templateJson,
        version: 1,
      })
      .returning();
    return result[0];
  });

  // Update template
  fastify.put('/:id', async (request, reply) => {
    const { id } = (request.params ?? {}) as { id?: string };
    if (!id || typeof id !== 'string') {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'id is required' });
    }
    const body = (request.body ?? {}) as any;
    const allowed: any = {};
    if (typeof body.name === 'string') allowed.name = body.name;
    if (body.templateJson !== undefined) allowed.templateJson = body.templateJson;
    if (typeof body.isActive === 'boolean') allowed.isActive = body.isActive;
    if (typeof body.isDefault === 'boolean') allowed.isDefault = body.isDefault;
    allowed.updatedAt = new Date();

    const result = await fastify.container.db.update(reportTemplates)
      .set(allowed)
      .where(eq(reportTemplates.id, id))
      .returning();
    return result[0];
  });

  // Get template by id
  fastify.get('/:id', async (request, reply) => {
    const { id } = (request.params ?? {}) as { id?: string };
    if (!id || typeof id !== 'string') {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'id is required' });
    }
    const rows = await fastify.container.db.select().from(reportTemplates).where(eq(reportTemplates.id, id));
    if (!rows.length) {
      reply.code(404);
      return { message: 'Template not found' } as any;
    }
    return rows[0];
  });

  // Delete template
  fastify.delete('/:id', async (request, reply) => {
    const { id } = (request.params ?? {}) as { id?: string };
    if (!id || typeof id !== 'string') {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'id is required' });
    }
    await fastify.container.db.delete(reportTemplates).where(eq(reportTemplates.id, id));
    reply.code(204);
    return {} as any;
  });

  // Preview HTML rendering for a template JSON (no persistence)
  fastify.post('/preview', async (request, reply) => {
    const { templateJson } = (request.body ?? {}) as any;
    
    // Sample scored profile payload for preview
    const sampleProfile = {
      domains: [
        { domain: 'safety', band: 'balanced', rawScore: 16, feltScore: 15, expressedScore: 17 },
        { domain: 'challenge', band: 'low', rawScore: 10, feltScore: 8, expressedScore: 12 },
        { domain: 'play', band: 'slightly_low', rawScore: 14, feltScore: 14, expressedScore: 14 },
      ],
      dimensions: [
        { dimension: 'self', domain: 'safety', band: 'balanced', rawScore: 24 },
        { dimension: 'others', domain: 'safety', band: 'slightly_low', rawScore: 20 },
        { dimension: 'past', domain: 'challenge', band: 'low', rawScore: 14 },
        { dimension: 'future', domain: 'challenge', band: 'very_low', rawScore: 8 },
        { dimension: 'senses', domain: 'play', band: 'balanced', rawScore: 26 },
        { dimension: 'perception', domain: 'play', band: 'low', rawScore: 16 },
      ],
      alignments: [
        { domain: 'safety', direction: 'masking_upward', severity: 'mild_divergence', gapMagnitude: 2 },
        { domain: 'challenge', direction: 'masking_downward', severity: 'significant_divergence', gapMagnitude: 4 },
        { domain: 'play', direction: 'aligned', severity: 'aligned', gapMagnitude: 0 },
      ],
    };

    const cmsBlocks = await fastify.container.cmsService.getActiveBlocks(templateJson.reportType);
    const htmlRenderer = fastify.container.reportService.getHtmlRenderer
      ? (fastify.container.reportService as any).getHtmlRenderer()
      : (fastify.container as any).reportService.getHtmlRenderer?.();

    // Fallback: HtmlTemplateRenderer is also constructible, but we should use the service instance
    const renderer = htmlRenderer ?? (fastify.container as any).htmlRenderer ?? fastify.container.reportService['htmlRenderer'];

    const html = renderer.render({
      template: templateJson,
      profile: sampleProfile,
      cmsBlocks,
      subjectName: 'Sample User',
      reportDate: new Date().toISOString(),
    });

    return { html };
  });
}
