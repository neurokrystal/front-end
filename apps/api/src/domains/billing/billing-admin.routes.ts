import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/infrastructure/auth/auth-middleware';
import { purchases } from './billing.schema';
import { and, desc, eq } from 'drizzle-orm';

export default async function billingAdminRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  server.addHook('preHandler', requirePlatformAdmin);

  server.get('/', {
    schema: {
      querystring: z.object({
        status: z.enum(['pending', 'completed', 'refunded', 'failed']).optional(),
        type: z.string().optional(),
        limit: z.coerce.number().min(1).max(500).optional().default(200),
      })
    }
  }, async (request, reply) => {
    const { status, type, limit } = request.query as { status?: 'pending'|'completed'|'refunded'|'failed', type?: string, limit: number };
    const conditions: any[] = [];
    if (status) conditions.push(eq(purchases.status, status));
    if (type) conditions.push(eq(purchases.purchaseType, type as any));

    const rows = await fastify.container.db
      .select()
      .from(purchases)
      .where(conditions.length ? and(...conditions) : undefined as any)
      .orderBy(desc(purchases.createdAt))
      .limit(limit);
    return rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString?.(), completedAt: r.completedAt?.toISOString?.() || null }));
  });

  server.get('/:id', {
    schema: { params: z.object({ id: z.string().uuid() }) }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const purchase = await fastify.container.billingRepository.getPurchaseById(id);
    if (!purchase) return reply.status(404).send({ code: 'NOT_FOUND' });
    const buyer = await fastify.container.userService.getUserById(purchase.buyerUserId).catch(() => null);
    return {
      ...purchase,
      createdAt: purchase.createdAt?.toISOString?.(),
      completedAt: purchase.completedAt?.toISOString?.() || null,
      buyer: buyer ? { id: buyer.id, email: buyer.email, displayName: buyer.displayName } : null,
    };
  });
}
