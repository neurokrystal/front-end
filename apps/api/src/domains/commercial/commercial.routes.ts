import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '@/infrastructure/auth/auth-middleware';
import { ReferralCodeOutput, CreateReferralCodeInput, AttributionOutput, PartnerOrgOutput, CreatePartnerOrgInput } from './commercial.dto';

export default async function commercialRoutes(fastify: FastifyInstance) {
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook('preHandler', requireAuth);

    // Reseller routes
    protectedRoutes.get('/referral-codes', {
      schema: {
        response: { 200: z.array(ReferralCodeOutput) },
      },
    }, async (request, reply) => {
      const { id: userId } = request.session!.user;
      const codes = await fastify.container.commercialService.getMyReferralCodes(userId);
      return codes.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString()
      }));
    });

    protectedRoutes.post('/referral-codes', {
      schema: {
        body: CreateReferralCodeInput,
        response: { 200: ReferralCodeOutput },
      },
    }, async (request, reply) => {
      const { id: userId } = request.session!.user;
      const { code } = request.body as z.infer<typeof CreateReferralCodeInput>;
      const created = await fastify.container.commercialService.createReferralCode(userId, code);
      return {
        ...created,
        createdAt: created.createdAt.toISOString()
      };
    });

    protectedRoutes.get('/attributions', {
      schema: {
        response: { 200: z.array(AttributionOutput) },
      },
    }, async (request, reply) => {
      const { id: userId } = request.session!.user;
      const attributions = await fastify.container.commercialService.getMyAttributions(userId);
      return attributions.map(a => ({
        ...a,
        createdAt: a.createdAt.toISOString()
      }));
    });

    // Admin-only partner org creation
    protectedRoutes.post('/partner-orgs', {
      schema: {
        body: CreatePartnerOrgInput,
        response: { 
          200: PartnerOrgOutput,
          403: z.object({ message: z.string() }),
        },
      },
    }, async (request, reply) => {
      if (request.session?.user?.role !== 'admin') {
        return reply.status(403).send({ message: 'Only admins can create partner orgs' });
      }
      const { id: userId } = request.session!.user;
      const { name, commissionRateBps } = request.body as z.infer<typeof CreatePartnerOrgInput>;
      return fastify.container.commercialService.createPartnerOrg(userId, name, commissionRateBps);
    });
  });
}
