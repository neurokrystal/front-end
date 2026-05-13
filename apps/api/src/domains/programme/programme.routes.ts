import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateProgrammeInput, ProgrammeOutput, EnrolmentOutput } from './programme.dto';
import { requireAuth } from '@/infrastructure/auth/auth-middleware';
import { ForbiddenError } from '@/shared/errors/domain-error';

export default async function programmeRoutes(fastify: FastifyInstance) {
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook('preHandler', requireAuth);

    // List programmes
    protectedRoutes.get('/', {
      schema: {
        response: { 200: z.array(ProgrammeOutput) },
      },
    }, async (request, reply) => {
      return fastify.container.programmeService.listProgrammes();
    });

    // Get programme
    protectedRoutes.get('/:id', {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: ProgrammeOutput },
      },
    }, async (request, reply) => {
      const { id } = request.params as { id: string };
      return fastify.container.programmeService.getProgramme(id);
    });

    // Enrol self
    protectedRoutes.post('/:id/enrol', {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: EnrolmentOutput },
      },
    }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.session!.user.id;
      return fastify.container.programmeService.enrolUser(id, userId);
    });

    // Enrol team
    protectedRoutes.post('/:id/enrol-team', {
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({ teamId: z.string().uuid() }),
        response: { 200: z.array(EnrolmentOutput) },
      },
    }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const { teamId } = request.body as { teamId: string };
      const userId = request.session!.user.id;
      return fastify.container.programmeService.enrolTeam(id, teamId, userId);
    });

    // My enrolments
    protectedRoutes.get('/my-enrolments', {
      schema: {
        response: { 200: z.array(EnrolmentOutput) },
      },
    }, async (request, reply) => {
      const userId = request.session!.user.id;
      return fastify.container.programmeService.getMyEnrolments(userId);
    });

    // Update progress
    protectedRoutes.put('/enrolments/:enrolmentId/progress', {
      schema: {
        params: z.object({ enrolmentId: z.string() }),
        body: z.object({ moduleId: z.string(), status: z.string() }),
      },
    }, async (request, reply) => {
      const { enrolmentId } = request.params as { enrolmentId: string };
      const { moduleId, status } = request.body as { moduleId: string, status: string };
      const userId = request.session!.user.id;
      await fastify.container.programmeService.updateProgress(enrolmentId, userId, moduleId, status);
      return { success: true };
    });

    // Submit reflection
    protectedRoutes.post('/enrolments/:enrolmentId/reflect', {
      schema: {
        params: z.object({ enrolmentId: z.string() }),
        body: z.object({ promptId: z.string(), response: z.string() }),
      },
    }, async (request, reply) => {
      const { enrolmentId } = request.params as { enrolmentId: string };
      const { promptId, response } = request.body as { promptId: string, response: string };
      const userId = request.session!.user.id;
      await fastify.container.programmeService.submitReflection(enrolmentId, userId, promptId, response);
      return { success: true };
    });

    // Admin: Create programme
    protectedRoutes.post('/', {
      schema: {
        body: CreateProgrammeInput,
        response: { 200: ProgrammeOutput },
      },
    }, async (request, reply) => {
      if (request.session!.user.role !== 'super_admin') {
        throw new ForbiddenError();
      }
      return fastify.container.programmeService.createProgramme(request.body as CreateProgrammeInput);
    });
  });
}
