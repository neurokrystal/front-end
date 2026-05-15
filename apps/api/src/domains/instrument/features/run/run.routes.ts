import { FastifyInstance } from "fastify";
import { requireAuth } from "@/infrastructure/auth/auth-middleware";
import { StartRunInput, SubmitResponseInput, SubmitBatchResponsesInput, RunStatusOutput, RunDetailOutput } from "./run.dto";
import { z } from 'zod';

export default async function runRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.post("/instruments/:slug/runs", {
    schema: {
      params: z.object({ slug: z.string() }),
      response: {
        201: RunStatusOutput
      }
    }
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const userId = request.session!.user.id;
    const result = await fastify.container.runService.startRun(userId, { instrumentSlug: slug });
    return reply.status(201).send(result);
  });

  fastify.post("/runs/:id/responses", {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: SubmitBatchResponsesInput,
      response: {
        204: z.null()
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.session!.user.id;
    await fastify.container.runService.submitBatchResponses(id, userId, request.body as SubmitBatchResponsesInput);
    return reply.status(204).send();
  });

  fastify.post("/runs/:id/complete", {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      response: {
        204: z.null()
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.session!.user.id;
    await fastify.container.runService.completeRun(id, userId);
    return reply.status(204).send();
  });

  fastify.get("/runs/:id", {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      response: {
        200: RunStatusOutput
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.session!.user.id;
    const result = await fastify.container.runService.getRunStatus(id, userId);
    return result;
  });

  fastify.get("/runs/:id/detail", {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      response: {
        200: RunDetailOutput
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.session!.user.id;
    const result = await fastify.container.runService.getRunDetail(id, userId);
    return result;
  });
}
