import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreatePurchaseInput, PurchaseOutput } from './billing.dto';
import { requireAuth } from '@/infrastructure/auth/auth-middleware';

export default async function billingRoutes(fastify: FastifyInstance) {
  // Protected routes
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook('preHandler', requireAuth);

    // Individual checkout
    protectedRoutes.post('/checkout/individual', {
      schema: {
        body: z.object({ referralCode: z.string().optional() }),
        response: { 200: PurchaseOutput },
      },
    }, async (request, reply) => {
      const { id: userId, email } = request.session!.user;
      const { referralCode } = request.body as { referralCode?: string };
      const result = await fastify.container.billingService.initiatePurchase(userId, email ?? '', {
        purchaseType: 'individual_assessment',
        referralCode,
      });
      return result;
    });

    // Org seat checkout
    protectedRoutes.post('/checkout/org-seats', {
      schema: {
        body: z.object({ 
          organizationId: z.string().uuid(),
          referralCode: z.string().optional(),
        }),
        response: { 200: PurchaseOutput },
      },
    }, async (request, reply) => {
      const { id: userId, email } = request.session!.user;
      const { organizationId, referralCode } = request.body as { organizationId: string, referralCode?: string };
      const result = await fastify.container.billingService.initiatePurchase(userId, email ?? '', {
        purchaseType: 'org_seat_bundle',
        organizationId,
        referralCode,
      });
      return result;
    });

    // List purchases
    protectedRoutes.get('/purchases', async (request, reply) => {
      const userId = request.session!.user.id;
      return fastify.container.billingService.getPurchasesForUser(userId);
    });

    // Purchase details
    protectedRoutes.get('/purchases/:id', {
      schema: {
        params: z.object({ id: z.string().uuid() }),
      },
    }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.session!.user.id;
      const purchase = await fastify.container.billingService.getPurchaseById(id);
      if (!purchase) return reply.status(404).send({ code: 'NOT_FOUND' });
      if (purchase.userId !== userId) return reply.status(403).send({ code: 'FORBIDDEN', message: 'Access denied' });
      return purchase;
    });

    // Comparison checkout
    protectedRoutes.post('/checkout/comparison', {
      schema: {
        body: z.object({
          reportType: z.enum(['relational_compass', 'collaboration_compass', 'family_compass']),
          primaryProfileId: z.string().uuid(),
          secondaryProfileId: z.string().uuid().optional(),
          recipientEmail: z.string().email().optional(),
          referralCode: z.string().optional(),
        }),
        response: { 200: PurchaseOutput },
      },
    }, async (request, reply) => {
      const { id: userId, email } = request.session!.user;
      const body = request.body as any;
      
      const result = await fastify.container.billingService.initiatePurchase(userId, email ?? '', {
        purchaseType: body.reportType,
        referralCode: body.referralCode,
        metadata: {
          primaryProfileId: body.primaryProfileId,
          secondaryProfileId: body.secondaryProfileId,
          recipientEmail: body.recipientEmail,
        }
      });
      return result;
    });
  });

  // Public routes
  // Webhook handler
  fastify.post('/webhook', {
    config: { rawBody: true }, // Ensure @fastify/raw-body registered in index.ts
  }, async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string;
    if (!sig) return reply.status(400).send({ code: 'MISSING_SIGNATURE' });
    const payload = (request as any).rawBody;
    if (!payload) {
      fastify.log.error('Stripe webhook: rawBody not available — @fastify/raw-body may not be registered');
      return reply.status(500).send({ code: 'INTERNAL_ERROR' });
    }
    await fastify.container.billingService.handleWebhook(payload, sig);
    return { received: true };
  });

  // Mock completion (Dev-only) — only register in non-production
  if (process.env.NODE_ENV !== 'production') {
    fastify.post('/mock/complete/:sessionId', async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      // We need to find the purchase associated with this mock session
      // For simplicity in mock mode, the provider could have a way to trigger it.
      // In MockPaymentProvider, we have simulatePaymentComplete(sessionId).
      // But we need to call BillingService.completePurchase(purchaseId, paymentId).
      
      // As a workaround for the mock route:
      const query = request.query as { purchaseId?: string };
      if (query.purchaseId) {
        await fastify.container.billingService.completePurchase(query.purchaseId, `mock_pay_${Date.now()}`);
        return { success: true };
      }
      return { success: false, message: 'purchaseId query param required for mock complete' };
    });
  }
}
