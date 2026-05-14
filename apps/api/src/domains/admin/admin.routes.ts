import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requirePlatformAdmin } from "@/infrastructure/auth/auth-middleware";
import { AdminStatsOutput, AdminUserSummary, GrantCompInput, ManualCorrectionInput } from './admin.dto';
import { z } from 'zod';
import { AUDIT_ACTIONS } from '@/domains/audit/audit.service';
import { BulkOperationInput } from './admin.service';

export default async function adminRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();
  
  server.addHook('preHandler', requirePlatformAdmin);

  server.get("/stats", async (request, reply) => {
    const stats = await fastify.container.adminService.getDashboardStats();
    return stats;
  });

  server.get("/stats/assessments-timeline", async (request, reply) => {
    return fastify.container.adminService.getAssessmentsTimeline();
  });

  server.get("/stats/domain-distribution", async (request, reply) => {
    return fastify.container.adminService.getDomainDistribution();
  });

  // NOTE: Do not attach a Zod response schema here — current fastify-type-provider-zod
  // version in this project crashes during serialization with array/object schemas.
  // We manually ensure shape in code until dependencies are aligned.
  server.get("/users", async (request, reply) => {
    const q = (request.query ?? {}) as Record<string, unknown>;
    const parseNum = (v: unknown, def: number) => {
      if (v === undefined || v === null || v === '') return def;
      const n = parseInt(String(v), 10);
      return Number.isFinite(n) ? n : def;
    };
    const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

    const limit = clamp(parseNum(q.limit, 50), 1, 200);
    const offset = Math.max(0, parseNum(q.offset, 0));

    const users = await fastify.container.adminService.listUsers(limit, offset);
    return users.map(u => ({
      ...u,
      createdAt: u.createdAt.toISOString()
    }));
  });

  server.get("/users/export", async (request, reply) => {
    const data = await fastify.container.adminService.exportUsers(request.session!.user.id);
    return data;
  });

  // Accept a simpler payload: { targetUserId, reason }
  server.post("/comp-grant", async (request, reply) => {
    const adminUserId = request.session!.user.id;
    const body = (request.body ?? {}) as any;
    const targetUserId: string | undefined = body.targetUserId || body.userId;
    const reason: string | undefined = body.reason;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'targetUserId is required' });
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'reason must be at least 10 characters' });
    }

    await fastify.container.adminService.grantCompAssessment(adminUserId, targetUserId, reason.trim());
    return { ok: true };
  });

  server.post("/profile-correction", async (request, reply) => {
    const body = (request.body ?? {}) as ManualCorrectionInput;
    if (!body || typeof body !== 'object' || !('profileId' in body) || !('reason' in body)) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'profileId and reason are required' });
    }
    await fastify.container.adminService.correctProfile(body.profileId, request.session!.user.id, body.reason);
    return { ok: true };
  });

  server.post("/impersonate", async (request, reply) => {
    const body = (request.body ?? {}) as any;
    const userId: string | undefined = body.userId;
    const reason: string | undefined = body.reason;
    if (!userId || typeof userId !== 'string') {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'userId is required' });
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'reason must be at least 10 characters' });
    }
    const actorUserId = request.session!.user.id;
    await fastify.container.auditService.log({
      actorUserId,
      actionType: AUDIT_ACTIONS.ADMIN_IMPERSONATE,
      resourceType: 'user',
      resourceId: userId,
      subjectUserId: userId,
      reason: reason.trim(),
    });
    return reply.status(202).send({ ok: true, message: 'Impersonation recorded. Read-only View As mode to be handled by client.' });
  });

  server.post("/bulk", async (request, reply) => {
    const body = (request.body ?? {}) as any;
    const { operation, targetIds, params, reason } = body || {};
    const allowedOps = new Set(['regenerate_reports', 'rescore_profiles', 'send_notification', 'tag_users']);
    if (!allowedOps.has(operation)) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'invalid operation' });
    }
    if (!Array.isArray(targetIds) || targetIds.some((t: any) => typeof t !== 'string')) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'targetIds must be an array of strings' });
    }
    if (typeof reason !== 'string' || reason.trim().length < 10) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'reason must be at least 10 characters' });
    }

    const opId = await fastify.container.adminService.startBulkOperation({ operation, targetIds, params, reason } as BulkOperationInput, request.session!.user.id);
    return { opId };
  });

  server.get("/bulk/:id", async (request, reply) => {
    const { id } = (request.params ?? {}) as { id?: string };
    if (!id || typeof id !== 'string') {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'id is required' });
    }
    const op = await fastify.container.adminService.getBulkOperation(id);
    if (!op) return reply.status(404).send({ code: 'NOT_FOUND' });
    return op;
  });

  server.get("/deletion-requests", async (request, reply) => {
    return fastify.container.deletionService.getQueuedRequests();
  });

  server.post("/deletion-requests/:id/execute", async (request, reply) => {
    const { id } = (request.params ?? {}) as { id?: string };
    if (!id || typeof id !== 'string') {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'id is required' });
    }
    return fastify.container.deletionService.executeDeletion(id, request.session!.user.id);
  });
}
