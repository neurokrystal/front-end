import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { GrantShareInput } from './sharing.dto';
import { z } from 'zod';
import { requireAuth } from '@/infrastructure/auth/auth-middleware';

export default async function (fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook('preHandler', requireAuth);

    // Create a share grant
    protectedRoutes.post('/grants', {
      schema: {
        body: GrantShareInput,
      },
    }, async (request, reply) => {
      const userId = request.session!.user.id;
      const result = await fastify.container.shareService.grantShare(userId, request.body as GrantShareInput);
      return result;
    });

    // Revoke a share grant
    protectedRoutes.delete('/grants/:id', {
      schema: {
        params: z.object({ id: z.string().uuid() }),
      },
    }, async (request, reply) => {
      const userId = request.session!.user.id;
      const { id } = request.params as { id: string };
      await fastify.container.shareService.revokeShare(id, userId);
      return reply.status(204).send();
    });

    // Get all shares where user is subject ("My Sharing")
    protectedRoutes.get('/my-shares', async (request, reply) => {
      const userId = request.session!.user.id;
      const result = await fastify.container.shareService.getMyShares(userId);
      return result;
    });

    // Get all resources shared with the user ("Shared With Me")
    protectedRoutes.get('/shared-with-me', async (request, reply) => {
      const userId = request.session!.user.id;
      const result = await fastify.container.shareService.getSharedWithMe(userId);
      return result;
    });

    // Get a specific share grant details
    protectedRoutes.get('/grants/:id', {
      schema: {
        params: z.object({ id: z.string().uuid() }),
      },
    }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const grant = await fastify.container.shareGrantRepository.findById(id);
      if (!grant) {
        return reply.status(404).send({ code: 'NOT_FOUND', message: 'Share grant not found' });
      }
      // Check if user is either subject or target
      const userId = request.session!.user.id;
      if (grant.subjectUserId !== userId && grant.targetUserId !== userId) {
        return reply.status(403).send({ code: 'FORBIDDEN', message: 'Access denied' });
      }
      return grant;
    });

    // Peer Sharing
    protectedRoutes.post('/peers/invite', {
      schema: {
        body: z.object({
          recipientEmail: z.string().email(),
          direction: z.enum(['one_way', 'mutual']),
        }),
      },
    }, async (request, reply) => {
      const userId = request.session!.user.id;
      const { recipientEmail, direction } = request.body as { recipientEmail: string, direction: 'one_way' | 'mutual' };
      return fastify.container.peerShareService.invite(userId, recipientEmail, direction);
    });

    protectedRoutes.post('/peers/accept', {
      schema: {
        body: z.object({
          token: z.string(),
        }),
      },
    }, async (request, reply) => {
      const userId = request.session!.user.id;
      const { token } = request.body as { token: string };
      return fastify.container.peerShareService.acceptInvite(token, userId);
    });

    protectedRoutes.get('/peers/me', async (request, reply) => {
      const userId = request.session!.user.id;
      return fastify.container.peerShareService.getMyPeerShares(userId);
    });
  });
}
