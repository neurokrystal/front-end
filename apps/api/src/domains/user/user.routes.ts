import { FastifyInstance } from "fastify";
import { requireAuth } from "@/infrastructure/auth/auth-middleware";
import { UserProfileOutput, UpdateProfileInput } from "./user.dto";

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get("/me", {
    schema: {
      response: {
        200: UserProfileOutput
      }
    }
  }, async (request, reply) => {
    const userId = request.session!.user.id;
    const profile = await fastify.container.userService.getProfile(userId);
    return profile;
  });

  fastify.put("/me", {
    schema: {
      body: UpdateProfileInput,
      response: {
        200: UserProfileOutput
      }
    }
  }, async (request, reply) => {
    const userId = request.session!.user.id;
    const profile = await fastify.container.userService.updateProfile(userId, request.body as UpdateProfileInput);
    return profile;
  });

  fastify.post("/me/deletion-request", async (request, reply) => {
    const userId = request.session!.user.id;
    return fastify.container.deletionService.requestDeletion(userId);
  });

  fastify.delete("/me/deletion-request", async (request, reply) => {
    const userId = request.session!.user.id;
    const pending = await fastify.container.deletionService.getQueuedRequests();
    const myRequest = pending.find(r => r.userId === userId);
    if (!myRequest) return reply.status(404).send({ code: 'NOT_FOUND' });
    await fastify.container.deletionService.cancelDeletion(userId);
    return { success: true };
  });
}
