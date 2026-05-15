import { FastifyInstance } from "fastify";
import { requireAuth } from "@/infrastructure/auth/auth-middleware";
import { z } from 'zod';
import { CONSENT_PURPOSES } from '@dimensional/shared';

export default async function consentRoutes(fastify: FastifyInstance) {
  fastify.post("/", {
    preHandler: [requireAuth],
    schema: {
      body: z.object({
        viewerUserId: z.string().uuid(),
        purpose: z.enum(CONSENT_PURPOSES),
      })
    }
  }, async (request, reply) => {
    const subjectUserId = request.session!.user.id;
    const { viewerUserId, purpose } = request.body as any;
    const result = await fastify.container.consentService.grantConsent(subjectUserId, viewerUserId, purpose);
    return result;
  });

  fastify.delete("/:id", {
    preHandler: [requireAuth],
    schema: {
      params: z.object({ id: z.string().uuid() })
    }
  }, async (request, reply) => {
    const actorUserId = request.session!.user.id;
    const { id } = request.params as { id: string };
    await fastify.container.consentService.revokeConsent(id, actorUserId);
    return reply.status(204).send();
  });
}
