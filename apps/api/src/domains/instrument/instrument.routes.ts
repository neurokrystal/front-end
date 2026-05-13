import { FastifyInstance } from "fastify";
import { requireAuth } from "@/infrastructure/auth/auth-middleware";
import { InstrumentOutput } from "./instrument.dto";
import { z } from 'zod';

export default async function instrumentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get("/:slug", {
    schema: {
      params: z.object({ slug: z.string() }),
      response: {
        200: InstrumentOutput
      }
    }
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const result = await fastify.container.instrumentService.getActiveInstrument(slug);
    return result;
  });
}
