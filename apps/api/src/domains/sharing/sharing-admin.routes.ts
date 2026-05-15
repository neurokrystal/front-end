import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/infrastructure/auth/auth-middleware';
import { shareGrants } from './share-grant.schema';
import { and, desc, eq } from 'drizzle-orm';
import { AUDIT_ACTIONS } from '../audit/audit.service';

export default async function sharingAdminRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  server.addHook('preHandler', requirePlatformAdmin);

  server.get('/', {
    schema: {
      querystring: z.object({
        status: z.enum(['active', 'revoked', 'expired']).optional(),
        targetType: z.enum(['user', 'team', 'organisation', 'coach', 'public']).optional(),
        limit: z.coerce.number().min(1).max(500).optional().default(200),
      })
    }
  }, async (request, reply) => {
    const { status, targetType, limit } = request.query as { status?: 'active'|'revoked'|'expired', targetType?: 'user'|'team'|'organisation'|'coach'|'public', limit: number };
    const conditions: any[] = [];
    if (status) conditions.push(eq(shareGrants.status, status));
    if (targetType) conditions.push(eq(shareGrants.targetType, targetType));

    const rows = await fastify.container.db
      .select()
      .from(shareGrants)
      .where(conditions.length ? and(...conditions) : undefined as any)
      .orderBy(desc(shareGrants.createdAt))
      .limit(limit);
    // Normalize dates to ISO
    return rows.map(r => ({ ...r, grantedAt: r.grantedAt?.toISOString?.() || null, revokedAt: r.revokedAt?.toISOString?.() || null, expiresAt: r.expiresAt?.toISOString?.() || null, createdAt: r.createdAt.toISOString?.() }));
  });

  // POST /api/v1/admin/share-grants — Provision a share on behalf of a user (admin)
  server.post('/', {
    schema: {
      body: z.object({
        subjectUserId: z.string().uuid(),
        targetType: z.enum(['user', 'team', 'organisation', 'coach']),
        targetUserId: z.string().uuid().optional(),
        targetTeamId: z.string().uuid().optional(),
        targetOrgId: z.string().uuid().optional(),
        resourceTypes: z.array(z.string()).min(1).default(['base']).optional(),
        reason: z.string().min(1),
        sendNotification: z.boolean().optional().default(true),
        expiresAt: z.string().datetime().optional(),
      })
    }
  }, async (request, reply) => {
    const adminUserId = request.session!.user.id;
    const body = request.body as {
      subjectUserId: string;
      targetType: 'user'|'team'|'organisation'|'coach';
      targetUserId?: string;
      targetTeamId?: string;
      targetOrgId?: string;
      resourceTypes?: string[];
      reason: string;
      sendNotification?: boolean;
      expiresAt?: string;
    };

    // Validate target id based on targetType
    if (body.targetType === 'user' || body.targetType === 'coach') {
      if (!body.targetUserId) return reply.status(400).send({ code: 'BAD_REQUEST', message: 'targetUserId is required for user/coach targetType' });
    } else if (body.targetType === 'team') {
      if (!body.targetTeamId) return reply.status(400).send({ code: 'BAD_REQUEST', message: 'targetTeamId is required for team targetType' });
    } else if (body.targetType === 'organisation') {
      if (!body.targetOrgId) return reply.status(400).send({ code: 'BAD_REQUEST', message: 'targetOrgId is required for organisation targetType' });
    }

    // Create share grant directly via repository to bypass subject preconditions (admin provision)
    const grant = await fastify.container.shareGrantRepository.create({
      subjectUserId: body.subjectUserId,
      targetType: body.targetType,
      targetUserId: body.targetUserId,
      targetTeamId: body.targetTeamId,
      targetOrgId: body.targetOrgId,
      resourceTypes: body.resourceTypes && body.resourceTypes.length ? body.resourceTypes : ['base'],
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      status: 'active',
      grantContext: 'admin_provision',
    });

    // Audit with admin actor and reason
    await fastify.container.auditService.log({
      actorUserId: adminUserId,
      actionType: AUDIT_ACTIONS.SHARE_GRANTED,
      resourceType: 'share_grant',
      resourceId: grant.id,
      subjectUserId: body.subjectUserId,
      metadata: {
        targetType: body.targetType,
        targetUserId: body.targetUserId,
        targetTeamId: body.targetTeamId,
        targetOrgId: body.targetOrgId,
        resourceTypes: grant.resourceTypes,
        adminReason: body.reason,
        via: 'admin',
      }
    });

    // Optional notification to target (only for user target)
    if (body.sendNotification && body.targetType === 'user' && body.targetUserId) {
      try {
        const subject = await fastify.container.userService.getUserById(body.subjectUserId);
        await fastify.container.notificationService.notify({
          type: 'share_granted',
          subjectUserId: body.subjectUserId,
          targetUserId: body.targetUserId,
          resourceTypes: grant.resourceTypes,
          subjectName: (subject as any)?.displayName || (subject as any)?.name || 'Someone',
        } as any);
      } catch (err) {
        // Do not fail the request if notification dispatch fails; log instead
        fastify.log.error({ err }, 'Failed to send admin provision share notification');
      }
    }

    return reply.status(201).send({ ...grant, grantedAt: grant.grantedAt?.toISOString?.() || new Date().toISOString() });
  });

  server.delete('/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({ reason: z.string().min(10) })
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason: string };
    const adminUserId = request.session!.user.id;
    await fastify.container.shareService.adminRevokeShare(id, adminUserId, reason);
    return reply.status(204).send();
  });
}
