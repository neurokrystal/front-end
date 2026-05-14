import { FastifyInstance } from "fastify";
import { requirePlatformAdmin } from "@/infrastructure/auth/auth-middleware";
import { z } from 'zod';

export default async function auditRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requirePlatformAdmin);

  fastify.get("/logs", {
    schema: {
      querystring: z.object({
        limit: z.coerce.number().optional().default(100),
      })
    }
  }, async (request, reply) => {
    const { limit } = request.query as { limit: number };
    const result = await fastify.container.auditService.getLogs({ limit });
    return result;
  });

  fastify.get("/subject/:userId", {
    schema: {
      params: z.object({ userId: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const result = await fastify.container.auditService.getAccessLogForSubject(userId);
    return result;
  });
}
