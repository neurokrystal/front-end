import { FastifyInstance } from "fastify";
import { requirePlatformAdmin } from "@/infrastructure/auth/auth-middleware";
import { z } from 'zod';
import { reportContentBlocks } from './cms.schema';
import { eq, and, sql } from 'drizzle-orm';

export default async function cmsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requirePlatformAdmin);

  // List blocks with filters
  fastify.get("/blocks", {
    schema: {
      querystring: z.object({
        reportType: z.string().optional(),
        sectionKey: z.string().optional(),
        domain: z.string().optional(),
        dimension: z.string().optional(),
        scoreBand: z.string().optional(),
        isActive: z.string().optional(), // "true" or "false"
        limit: z.string().optional(),
        offset: z.string().optional(),
      })
    }
  }, async (request, reply) => {
    const q = request.query as any;
    const conditions: any[] = [];
    if (q.reportType) conditions.push(eq(reportContentBlocks.reportType, q.reportType));
    if (q.sectionKey) conditions.push(eq(reportContentBlocks.sectionKey, q.sectionKey));
    if (q.domain) conditions.push(eq(reportContentBlocks.domain, q.domain));
    if (q.dimension) conditions.push(eq(reportContentBlocks.dimension, q.dimension));
    if (q.scoreBand) conditions.push(eq(reportContentBlocks.scoreBand, q.scoreBand));
    if (q.isActive === 'true') conditions.push(eq(reportContentBlocks.isActive, true));
    if (q.isActive === 'false') conditions.push(eq(reportContentBlocks.isActive, false));

    const limit = parseInt(q.limit || '200');
    const offset = parseInt(q.offset || '0');

    const results = await fastify.container.db
      .select()
      .from(reportContentBlocks)
      .where(conditions.length > 0 ? and(...conditions) : undefined as any)
      .orderBy(reportContentBlocks.displayOrder)
      .limit(limit)
      .offset(offset);

    // Also get total count for pagination
    const countResult = await fastify.container.db
      .select({ count: sql<number>`count(*)` })
      .from(reportContentBlocks)
      .where(conditions.length > 0 ? and(...conditions) : undefined as any);

    return { blocks: results, total: Number(countResult[0].count) };
  });

  // Get single block
  fastify.get("/blocks/:id", {
    schema: { params: z.object({ id: z.string() }) }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await fastify.container.db.select()
      .from(reportContentBlocks)
      .where(eq(reportContentBlocks.id, id))
      .limit(1);
    if (!result[0]) return reply.status(404).send({ code: 'NOT_FOUND' });
    return result[0]; 
  });

  // Create block
  fastify.post("/blocks", {
    schema: {
      body: z.object({
        reportType: z.string(),
        sectionKey: z.string(),
        domain: z.string().nullable().optional(),
        dimension: z.string().nullable().optional(),
        scoreBand: z.string().nullable().optional(),
        alignmentDirection: z.string().nullable().optional(),
        alignmentSeverity: z.string().nullable().optional(),
        locale: z.string().default('en'),
        contentText: z.string().min(1),
        displayOrder: z.number().int().default(0),
        isActive: z.boolean().default(true),
      })
    }
  }, async (request, reply) => {
    const body = request.body as any;
    const result = await fastify.container.db.insert(reportContentBlocks)
      .values(body)
      .returning();
    return reply.status(201).send(result[0]);
  });

  // Update block
  fastify.put("/blocks/:id", {
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({
        reportType: z.string().optional(),
        sectionKey: z.string().optional(),
        domain: z.string().nullable().optional(),
        dimension: z.string().nullable().optional(),
        scoreBand: z.string().nullable().optional(),
        alignmentDirection: z.string().nullable().optional(),
        alignmentSeverity: z.string().nullable().optional(),
        contentText: z.string().optional(),
        displayOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
      })
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const result = await fastify.container.db.update(reportContentBlocks)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(reportContentBlocks.id, id))
      .returning();
    if (!result[0]) return reply.status(404).send({ code: 'NOT_FOUND' });
    return result[0];
  });

  // Bulk import
  fastify.post("/blocks/bulk-import", {
    schema: {
      body: z.object({
        blocks: z.array(z.object({
          reportType: z.string(),
          sectionKey: z.string(),
          domain: z.string().nullable().optional(),
          dimension: z.string().nullable().optional(),
          scoreBand: z.string().nullable().optional(),
          contentText: z.string(),
          displayOrder: z.number().int().default(0),
          isActive: z.boolean().default(true),
        }))
      })
    }
  }, async (request, reply) => {
    const { blocks } = request.body as any;
    const results = await fastify.container.db.insert(reportContentBlocks)
      .values(blocks)
      .returning();
    return { imported: results.length };
  });

  // Coverage matrix
  fastify.get("/coverage/:reportType", {
    schema: { params: z.object({ reportType: z.string() }) }
  }, async (request, reply) => {
    const { reportType } = request.params as { reportType: string };
    
    const blocks = await fastify.container.db.select({
      sectionKey: reportContentBlocks.sectionKey,
      domain: reportContentBlocks.domain,
      dimension: reportContentBlocks.dimension,
      scoreBand: reportContentBlocks.scoreBand,
      isActive: reportContentBlocks.isActive,
      id: reportContentBlocks.id,
    })
    .from(reportContentBlocks)
    .where(eq(reportContentBlocks.reportType, reportType));
    
    // Build coverage map
    const coverage = blocks.map(b => ({
      sectionKey: b.sectionKey,
      domain: b.domain,
      dimension: b.dimension,
      scoreBand: b.scoreBand,
      isActive: b.isActive,
      id: b.id,
    }));
    
    return { 
      reportType, 
      coverage, 
      totalBlocks: blocks.length,
      activeBlocks: blocks.filter(b => b.isActive).length,
    };
  });

  // Version management (stub retained for future work)
  fastify.post("/versions", async (request, reply) => {
    return {};
  });
}
