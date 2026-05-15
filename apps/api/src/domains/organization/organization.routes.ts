import { FastifyInstance } from "fastify";
import teamRoutes from "./features/team/team.routes";
import { requireAuth } from "@/infrastructure/auth/auth-middleware";

export default async function organizationRoutes(fastify: FastifyInstance) {
  // M2: Add auth hook safety net to protect future routes by default
  fastify.addHook('preHandler', requireAuth);
  fastify.register(teamRoutes, { prefix: '/teams' });
}
