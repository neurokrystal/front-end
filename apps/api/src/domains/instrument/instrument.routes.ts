import { FastifyInstance } from "fastify";
import { requireAuth, requirePlatformAdmin } from "@/infrastructure/auth/auth-middleware";
import { InstrumentOutput } from "./instrument.dto";
import { z } from 'zod';
import { instruments, instrumentVersions } from './instrument.schema';
import { eq, desc } from 'drizzle-orm';

export default async function instrumentRoutes(fastify: FastifyInstance) {
  // Default: all routes in this plugin require auth
  fastify.addHook('preHandler', requireAuth);

  // GET /api/v1/instruments — list all instruments (admin)
  fastify.get("/", { preHandler: requirePlatformAdmin }, async (request, reply) => {
    const rows = await fastify.container.db
      .select({
        id: instruments.id,
        name: instruments.name,
        slug: instruments.slug,
        description: instruments.description,
        status: instruments.status,
        createdAt: instruments.createdAt,
      })
      .from(instruments)
      .orderBy(instruments.createdAt);
    return rows;
  });

  // GET /api/v1/instruments/:id/versions — list versions for an instrument
  fastify.get("/:id/versions", async (request, reply) => {
    const { id } = request.params as { id: string };
    const versions = await fastify.container.db
      .select()
      .from(instrumentVersions)
      .where(eq(instrumentVersions.instrumentId, id))
      .orderBy(desc(instrumentVersions.versionNumber));
    return versions;
  });

  // GET /api/v1/instruments/:id — get single instrument by ID (or slug fallback)
  fastify.get("/:id", {
    schema: {
      params: z.object({ id: z.string() }),
      response: {
        200: InstrumentOutput
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Try by ID first
    let result = await fastify.container.db
      .select()
      .from(instruments)
      .where(eq(instruments.id, id))
      .limit(1);

    // Fallback to slug
    if (!result[0]) {
      result = await fastify.container.db
        .select()
        .from(instruments)
        .where(eq(instruments.slug, id))
        .limit(1);
    }

    if (!result[0]) {
      return (reply as any).code(404).send({ code: 'NOT_FOUND' });
    }
    return result[0];
  });

  // PUT /api/v1/instruments/:instrumentId/versions/:versionId/config — update scoring config (admin)
  fastify.put("/:instrumentId/versions/:versionId/config", { preHandler: requirePlatformAdmin }, async (request, reply) => {
    const { instrumentId, versionId } = request.params as { instrumentId: string; versionId: string };
    const body = (request.body ?? {}) as { config: any };

    if (!body || typeof body !== 'object' || !('config' in body)) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'config is required' });
    }

    // Ensure the version belongs to the specified instrument
    const ver = await fastify.container.db
      .select({ id: instrumentVersions.id, instrumentId: instrumentVersions.instrumentId })
      .from(instrumentVersions)
      .where(eq(instrumentVersions.id, versionId))
      .limit(1);
    if (!ver[0] || ver[0].instrumentId !== instrumentId) {
      return (reply as any).code(404).send({ code: 'NOT_FOUND' });
    }

    await fastify.container.db
      .update(instrumentVersions)
      .set({ configJson: body.config })
      .where(eq(instrumentVersions.id, versionId));

    return { ok: true };
  });
}
