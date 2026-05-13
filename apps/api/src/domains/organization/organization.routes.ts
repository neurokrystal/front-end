import { FastifyInstance } from "fastify";
import teamRoutes from "./features/team/team.routes";

export default async function organizationRoutes(fastify: FastifyInstance) {
  fastify.register(teamRoutes, { prefix: '/teams' });
}
