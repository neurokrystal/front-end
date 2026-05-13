import { FastifyInstance } from "fastify";
import { requireAuth } from "@/infrastructure/auth/auth-middleware";
import { TeamOutput, CreateTeamInput, AddTeamMemberInput } from "./team.dto";
import { z } from 'zod';

export default async function teamRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.post("/", {
    schema: {
      body: CreateTeamInput,
      response: {
        201: TeamOutput
      }
    }
  }, async (request, reply) => {
    const result = await fastify.container.teamService.createTeam(request.body as CreateTeamInput);
    return reply.status(201).send(result);
  });

  fastify.get("/org/:organizationId", {
    schema: {
      params: z.object({ organizationId: z.string().uuid() }),
      response: {
        200: z.array(TeamOutput)
      }
    }
  }, async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string };
    const result = await fastify.container.teamService.getOrganizationTeams(organizationId);
    return result;
  });

  fastify.post("/:teamId/members", {
    schema: {
      params: z.object({ teamId: z.string().uuid() }),
      body: AddTeamMemberInput,
      response: {
        204: z.null()
      }
    }
  }, async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    await fastify.container.teamService.addMember(teamId, request.body as AddTeamMemberInput);
    return reply.status(204).send();
  });
}
