import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requirePlatformAdmin } from "@/infrastructure/auth/auth-middleware";
import { AdminStatsOutput, AdminUserSummary, GrantCompInput, ManualCorrectionInput } from './admin.dto';
import { z } from 'zod';
import { AUDIT_ACTIONS } from '@/domains/audit/audit.service';
import { BulkOperationInput } from './admin.service';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '@/infrastructure/config';
import { sql } from 'drizzle-orm';
import { auth } from '@/infrastructure/auth/better-auth';

export default async function adminRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();
  
  // Wrap admin guard to allow certain routes (impersonation bootstrap/end)
  // to be accessible without platform_admin role. This is necessary because
  // once impersonating, the user will not have admin privileges but still
  // needs to establish/end the session.
  server.addHook('preHandler', async (request, reply) => {
    const allowImpersonation = (request as any).routeConfig?.allowImpersonation === true;
    if (allowImpersonation) return;
    return requirePlatformAdmin(request, reply);
  });

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
    // Accept { targetUserId, reason } (preferred) or { userId, reason } for backwards-compat
    const body = (request.body ?? {}) as any;
    const targetUserId: string | undefined = body.targetUserId || body.userId;
    const reason: string | undefined = body.reason;
    if (!targetUserId || typeof targetUserId !== 'string') {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'targetUserId is required' });
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'reason must be at least 10 characters' });
    }

    const adminUser = request.session!.user;

    // Verify target exists to provide early feedback (and avoid issuing junk tokens)
    const targetUser = await fastify.container.db.execute(
      sql`SELECT id, email FROM "user" WHERE id = ${targetUserId} LIMIT 1`
    );
    if (!targetUser.rows[0]) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Target user not found' });
    }

    // Audit log — start impersonation issuance
    await fastify.container.auditService.log({
      actorUserId: adminUser.id,
      actionType: AUDIT_ACTIONS.ADMIN_IMPERSONATE,
      resourceType: 'user',
      resourceId: targetUserId,
      subjectUserId: targetUserId,
      reason: reason.trim(),
      metadata: { adminEmail: adminUser.email, action: 'start' },
    });

    // Create short-lived signed JWT (30 mins)
    const expiresAt = Date.now() + 30 * 60 * 1000;
    const token = jwt.sign(
      { adminUserId: adminUser.id, targetUserId, reason: reason.trim() },
      env.BETTER_AUTH_SECRET,
      { expiresIn: '30m', subject: 'impersonation' }
    );

    return { token, expiresAt: new Date(expiresAt).toISOString() };
  });

  // Establish a real session for the impersonated user and redirect to consumer dashboard
  server.get("/impersonate/session", { config: { allowImpersonation: true } }, async (request, reply) => {
    const q = (request.query ?? {}) as { token?: string };
    const token = q.token;
    if (!token) return reply.status(400).send({ code: 'BAD_REQUEST', message: 'token is required' });

    // Verify JWT
    let imp: any;
    try {
      imp = jwt.verify(token, env.BETTER_AUTH_SECRET, { subject: 'impersonation' });
    } catch (_e) {
      return reply.status(401).send({ code: 'INVALID_TOKEN' });
    }

    // Confirm target still exists
    const targetUser = await fastify.container.db.execute(
      sql`SELECT id, email, role FROM "user" WHERE id = ${imp.targetUserId} LIMIT 1`
    );
    if (!targetUser.rows[0]) {
      return reply.status(404).send({ code: 'USER_NOT_FOUND' });
    }

    // Attempt Better-Auth session creation by user id
    // Prefer an official API if available; fall back to manual session creation via auth.api (cookie set)
    try {
      // Some better-auth versions support signInWithId; if not available, this will throw
      const res: any = await (auth.api as any).signInWithId?.({
        body: { userId: imp.targetUserId },
        headers: new Headers(request.headers as Record<string, string>),
      });
      if (!res) {
        throw new Error('signInWithId not supported');
      }
    } catch (_e) {
      // Manual fallback: create session by calling auth.handler on the sign-in endpoint if exposed,
      // or use internal createSession if present. As a minimal compatible path, call signInEmail with a one-time link is out-of-scope.
      // Instead, try to leverage a generic createSession API if present.
      const createSession = (auth.api as any).createSession;
      if (typeof createSession === 'function') {
        await createSession({
          body: { userId: imp.targetUserId },
          headers: new Headers(request.headers as Record<string, string>),
        });
      } else {
        // As last resort, insert a session row and set cookie manually is complex and version-specific.
        // Return a clear message to avoid silent failure.
        return reply.status(501).send({ code: 'NOT_IMPLEMENTED', message: 'Server cannot create session for impersonation with current Better-Auth version' });
      }
    }

    // Redirect to consumer dashboard with an impersonation hint
    return reply.redirect(`/dashboard?impersonating=true&admin=${encodeURIComponent(imp.adminUserId)}`);
  });

  // End impersonation: sign out current session and tell client where to go
  server.post("/impersonate/end", { config: { allowImpersonation: true } }, async (request, reply) => {
    try {
      // Best-effort audit end of impersonation (actor is the currently impersonated user)
      if (request.session?.user?.id) {
        await fastify.container.auditService.log({
          actorUserId: request.session.user.id,
          actionType: AUDIT_ACTIONS.ADMIN_IMPERSONATE,
          resourceType: 'user',
          resourceId: request.session.user.id,
          subjectUserId: request.session.user.id,
          reason: 'Impersonation session ended',
          metadata: { action: 'end', note: 'Actor is the impersonated user; admin identity in the start log' },
        });
      }
    } catch {}
    try {
      await auth.api.signOut({ headers: new Headers(request.headers as Record<string, string>) });
    } catch {}
    return { redirectTo: '/admin/users' };
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
