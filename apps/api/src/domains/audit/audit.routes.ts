import { FastifyInstance } from "fastify";
import { requirePlatformAdmin } from "@/infrastructure/auth/auth-middleware";
import { z } from 'zod';

export default async function auditRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requirePlatformAdmin);

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
