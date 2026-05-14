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

  server.get("/stats", {
    schema: {
      response: { 200: AdminStatsOutput }
    }
  }, async (request, reply) => {
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

  server.post("/comp-grant", {
    schema: {
      body: GrantCompInput,
    }
  }, async (request, reply) => {
    await fastify.container.adminService.grantComp(request.body as GrantCompInput);
    return { ok: true };
  });

  server.post("/profile-correction", {
    schema: {
      body: ManualCorrectionInput,
    }
  }, async (request, reply) => {
    const body = request.body as ManualCorrectionInput;
    await fastify.container.adminService.correctProfile(body.profileId, request.session!.user.id, body.reason);
    return { ok: true };
  });

  server.post("/impersonate", {
    schema: {
      body: z.object({ userId: z.string().uuid() }),
      response: { 202: z.object({ ok: z.boolean(), message: z.string() }) }
    }
  }, async (request, reply) => {
    const { userId } = request.body as { userId: string };
    const actorUserId = request.session!.user.id;
    await fastify.container.auditService.log({
      actorUserId,
      actionType: AUDIT_ACTIONS.ADMIN_IMPERSONATE,
      resourceType: 'user',
      resourceId: userId,
      subjectUserId: userId,
    });
    return reply.status(202).send({ ok: false, message: 'Impersonation endpoint stubbed — session issuance to be wired with Better-Auth.' });
  });

  server.post("/bulk", {
    schema: {
      body: z.object({
        operation: z.enum(['regenerate_reports', 'rescore_profiles', 'send_notification', 'tag_users']),
        targetIds: z.array(z.string()),
        params: z.record(z.any()).optional(),
        reason: z.string().min(10),
      })
    }
  }, async (request, reply) => {
    const opId = await fastify.container.adminService.startBulkOperation(request.body as BulkOperationInput, request.session!.user.id);
    return { opId };
  });

  server.get("/bulk/:id", {
    schema: {
      params: z.object({ id: z.string() }),
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const op = await fastify.container.adminService.getBulkOperation(id);
    if (!op) return reply.status(404).send({ code: 'NOT_FOUND' });
    return op;
  });

  server.get("/deletion-requests", async (request, reply) => {
    return fastify.container.deletionService.getQueuedRequests();
  });

  server.post("/deletion-requests/:id/execute", {
    schema: {
      params: z.object({ id: z.string() }),
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return fastify.container.deletionService.executeDeletion(id, request.session!.user.id);
  });
}
