import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/infrastructure/auth/auth-middleware';
import { sql } from 'drizzle-orm';
import { teams as teamsTable } from './features/team/team.schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { AUDIT_ACTIONS } from '@/domains/audit/audit.service';

export default async function orgAdminRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();
  server.addHook('preHandler', requirePlatformAdmin);

  // GET /api/v1/admin/organisations — list all organisations
  server.get('/', async (request, reply) => {
    const orgs = await fastify.container.db.execute(sql`
      SELECT 
        o.id, 
        o.name, 
        o.slug, 
        o.created_at AS "createdAt",
        (SELECT COUNT(*)::int FROM member m WHERE m.organization_id = o.id) AS member_count,
        (SELECT COUNT(*)::int FROM teams t WHERE t.organization_id = o.id) AS team_count
      FROM organization o
      ORDER BY o.created_at DESC
    `);
    return orgs.rows;
  });

  // GET /api/v1/admin/organisations/:id — single org with details
  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const org = await fastify.container.db.execute(sql`
      SELECT 
        o.id,
        o.name,
        o.slug,
        o.created_at AS "createdAt"
      FROM organization o WHERE o.id = ${id}
    `);
    if (!org.rows[0]) return reply.status(404).send({ code: 'NOT_FOUND' });

    // Get members (Better-Auth member + user join)
    const members = await fastify.container.db.execute(sql`
      SELECT 
        m.id,
        m.user_id AS "userId",
        m.organization_id AS "organizationId",
        m.role,
        m.created_at AS "joinedAt",
        u.name,
        u.email
      FROM member m 
      JOIN "user" u ON u.id = m.user_id 
      WHERE m.organization_id = ${id}
      ORDER BY m.created_at DESC
    `);

    // Get teams via Drizzle
    const teams = await fastify.container.db
      .select()
      .from(teamsTable)
      .where(eq(teamsTable.organizationId, id));

    // Seat allocations summary (purchased vs allocated)
    const seatAgg = await fastify.container.db.execute(sql`
      SELECT 
        COUNT(*)::int AS purchased,
        COUNT(*) FILTER (WHERE user_id IS NOT NULL AND reclaimed_at IS NULL)::int AS allocated
      FROM seat_allocations 
      WHERE organization_id = ${id}
    `);
    const purchased = (seatAgg.rows[0]?.purchased as number) ?? 0;
    const allocated = (seatAgg.rows[0]?.allocated as number) ?? 0;
    const remaining = purchased - allocated;

    return { 
      ...org.rows[0], 
      members: members.rows, 
      teams,
      seats: { purchased, allocated, remaining }
    };
  });

  // PUT /api/v1/admin/organisations/:id — update org details
  server.put('/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        name: z.string().min(2).max(200),
        slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
      })
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, slug } = request.body as { name: string; slug: string };
    await fastify.container.db.execute(sql`
      UPDATE organization 
      SET name = ${name}, slug = ${slug}
      WHERE id = ${id}
    `);
    return reply.status(204).send();
  });

  // POST /api/v1/admin/organisations/:id/members — add member (invite)
  server.post('/:id/members', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        email: z.string().email(),
        role: z.enum(['member', 'admin']).default('member'),
        allocateSeat: z.boolean().optional().default(false),
        sendInvite: z.boolean().optional().default(false),
      })
    }
  }, async (request, reply) => {
    const adminUserId = request.session!.user.id;
    const { id } = request.params as { id: string };
    const { email, role, allocateSeat, sendInvite } = request.body as { email: string; role: 'member'|'admin'; allocateSeat?: boolean; sendInvite?: boolean };

    // 1) Ensure user exists (placeholder if needed)
    const emailLower = email.toLowerCase();
    let user = await fastify.container.db.execute(sql`
      SELECT id, name, email FROM "user" WHERE lower(email) = ${emailLower} LIMIT 1
    `);
    let userId = user.rows[0]?.id as string | undefined;
    if (!userId) {
      userId = randomUUID();
      const name = email.split('@')[0];
      await fastify.container.db.execute(sql`
        INSERT INTO "user" (id, email, name)
        VALUES (${userId}, ${emailLower}, ${name})
      `);
    }

    // 2) Create or update membership
    const existing = await fastify.container.db.execute(sql`
      SELECT id FROM member WHERE user_id = ${userId} AND organization_id = ${id} LIMIT 1
    `);
    if (existing.rows[0]?.id) {
      await fastify.container.db.execute(sql`
        UPDATE member SET role = ${role} WHERE id = ${existing.rows[0].id}
      `);
    } else {
      await fastify.container.db.execute(sql`
        INSERT INTO member (id, user_id, organization_id, role)
        VALUES (${randomUUID()}, ${userId}, ${id}, ${role})
      `);
    }

    // 3) Optionally allocate a seat
    let allocatedSeatId: string | null = null;
    if (allocateSeat) {
      const available = await fastify.container.db.execute(sql`
        SELECT id FROM seat_allocations
        WHERE organization_id = ${id} AND user_id IS NULL AND reclaimed_at IS NULL AND allocated_at IS NULL
        ORDER BY created_at ASC
        LIMIT 1
      `);
      const seatId = available.rows[0]?.id as string | undefined;
      if (!seatId) {
        return reply.status(400).send({ code: 'NO_SEATS_AVAILABLE', message: 'No unallocated seats available to assign' });
      }
      await fastify.container.db.execute(sql`
        UPDATE seat_allocations SET user_id = ${userId}, allocated_at = now() WHERE id = ${seatId}
      `);
      allocatedSeatId = seatId;

      // Audit seat assignment
      await fastify.container.auditService.log({
        actorUserId: adminUserId,
        actionType: AUDIT_ACTIONS.BILLING_SEAT_ASSIGNED,
        resourceType: 'seat_allocation',
        resourceId: seatId,
        subjectUserId: userId,
        metadata: { organizationId: id }
      });
    }

    // 4) Optionally send invitation email
    if (sendInvite) {
      try {
        const org = await fastify.container.db.execute(sql`SELECT name FROM organization WHERE id = ${id}`);
        const inviter = await fastify.container.userService.getUserById(adminUserId);
        const orgName = (org.rows[0]?.name as string) || 'your organisation';
        const inviterName = (inviter as any)?.displayName || (inviter as any)?.name || 'An administrator';
        // Generate a simple token-less URL to sign up/login; Better-Auth URL is used elsewhere
        const signupUrl = `${process.env.BETTER_AUTH_URL || 'https://app.dimensional.systems'}/auth/signup?email=${encodeURIComponent(emailLower)}`;
        await fastify.container.notificationService.notify({
          type: 'seat_invitation',
          email: emailLower,
          orgName,
          inviterName,
          signupUrl,
        } as any);
      } catch (err) {
        fastify.log.error({ err }, 'Failed to send seat invitation email');
      }
    }

    // 5) Audit member added
    await fastify.container.auditService.log({
      actorUserId: adminUserId,
      actionType: AUDIT_ACTIONS.ADMIN_BULK_OPERATION,
      resourceType: 'organization',
      resourceId: id,
      subjectUserId: userId,
      metadata: { event: 'member_added', role, allocatedSeatId }
    });

    // Return member summary
    return reply.status(201).send({ userId, role, email: emailLower, allocatedSeatId });
  });

  // DELETE /api/v1/admin/organisations/:id/members/:userId — remove member (reclaim seat)
  server.delete('/:id/members/:userId', {
    schema: {
      params: z.object({ id: z.string().uuid(), userId: z.string().uuid() }),
    }
  }, async (request, reply) => {
    const adminUserId = request.session!.user.id;
    const { id, userId } = request.params as { id: string; userId: string };

    // Remove membership
    await fastify.container.db.execute(sql`
      DELETE FROM member WHERE organization_id = ${id} AND user_id = ${userId}
    `);

    // Reclaim any active seat
    const activeSeats = await fastify.container.db.execute(sql`
      SELECT id FROM seat_allocations WHERE organization_id = ${id} AND user_id = ${userId} AND reclaimed_at IS NULL
    `);
    for (const row of activeSeats.rows as any[]) {
      await fastify.container.db.execute(sql`
        UPDATE seat_allocations SET reclaimed_at = now(), user_id = NULL WHERE id = ${row.id}
      `);
      await fastify.container.auditService.log({
        actorUserId: adminUserId,
        actionType: AUDIT_ACTIONS.BILLING_SEAT_RECLAIMED,
        resourceType: 'seat_allocation',
        resourceId: row.id,
        subjectUserId: userId,
        metadata: { organizationId: id, reason: 'member_removed' }
      });
    }

    // Audit member removed
    await fastify.container.auditService.log({
      actorUserId: adminUserId,
      actionType: AUDIT_ACTIONS.ADMIN_BULK_OPERATION,
      resourceType: 'organization',
      resourceId: id,
      subjectUserId: userId,
      metadata: { event: 'member_removed', reclaimedSeats: activeSeats.rows.length }
    });

    return reply.status(204).send();
  });

  // PUT /api/v1/admin/organisations/:id/members/:userId — change role
  server.put('/:id/members/:userId', {
    schema: {
      params: z.object({ id: z.string().uuid(), userId: z.string().uuid() }),
      body: z.object({ role: z.enum(['member', 'admin']) })
    }
  }, async (request, reply) => {
    const adminUserId = request.session!.user.id;
    const { id, userId } = request.params as { id: string; userId: string };
    const { role } = request.body as { role: 'member'|'admin' };

    await fastify.container.db.execute(sql`
      UPDATE member SET role = ${role} WHERE organization_id = ${id} AND user_id = ${userId}
    `);

    await fastify.container.auditService.log({
      actorUserId: adminUserId,
      actionType: AUDIT_ACTIONS.ADMIN_PROFILE_EDIT,
      resourceType: 'organization',
      resourceId: id,
      subjectUserId: userId,
      metadata: { event: 'member_role_changed', role }
    });

    return reply.status(204).send();
  });

  // GET /api/v1/admin/organisations/:id/seats — list seat allocations
  server.get('/:id/seats', {
    schema: { params: z.object({ id: z.string().uuid() }) }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const rows = await fastify.container.db.execute(sql`
      SELECT 
        s.id,
        s.user_id AS "userId",
        s.allocated_at AS "allocatedAt",
        s.reclaimed_at AS "reclaimedAt",
        u.name,
        u.email
      FROM seat_allocations s
      LEFT JOIN "user" u ON u.id = s.user_id
      WHERE s.organization_id = ${id}
      ORDER BY s.created_at ASC
    `);
    return rows.rows.map((r: any) => ({ ...r, allocatedAt: r.allocatedAt ? new Date(r.allocatedAt).toISOString() : null, reclaimedAt: r.reclaimedAt ? new Date(r.reclaimedAt).toISOString() : null }));
  });

  // POST /api/v1/admin/organisations/:id/seats — allocate seat to member
  server.post('/:id/seats', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({ userId: z.string().uuid() })
    }
  }, async (request, reply) => {
    const adminUserId = request.session!.user.id;
    const { id } = request.params as { id: string };
    const { userId } = request.body as { userId: string };

    const available = await fastify.container.db.execute(sql`
      SELECT id FROM seat_allocations
      WHERE organization_id = ${id} AND user_id IS NULL AND reclaimed_at IS NULL AND allocated_at IS NULL
      ORDER BY created_at ASC
      LIMIT 1
    `);
    const seatId = (available.rows[0]?.id as string) || null;
    if (!seatId) {
      return reply.status(400).send({ code: 'NO_SEATS_AVAILABLE', message: 'No unallocated seats available to assign' });
    }
    await fastify.container.db.execute(sql`
      UPDATE seat_allocations SET user_id = ${userId}, allocated_at = now() WHERE id = ${seatId}
    `);

    await fastify.container.auditService.log({
      actorUserId: adminUserId,
      actionType: AUDIT_ACTIONS.BILLING_SEAT_ASSIGNED,
      resourceType: 'seat_allocation',
      resourceId: seatId,
      subjectUserId: userId,
      metadata: { organizationId: id }
    });

    return reply.status(201).send({ id: seatId, userId });
  });

  // DELETE /api/v1/admin/organisations/:id/seats/:seatId — reclaim seat
  server.delete('/:id/seats/:seatId', {
    schema: {
      params: z.object({ id: z.string().uuid(), seatId: z.string().uuid() })
    }
  }, async (request, reply) => {
    const adminUserId = request.session!.user.id;
    const { id, seatId } = request.params as { id: string; seatId: string };

    const seat = await fastify.container.db.execute(sql`SELECT user_id FROM seat_allocations WHERE id = ${seatId} AND organization_id = ${id}`);
    const subjectUserId = (seat.rows[0]?.user_id as string) || null;

    await fastify.container.db.execute(sql`
      UPDATE seat_allocations SET reclaimed_at = now(), user_id = NULL WHERE id = ${seatId}
    `);

    await fastify.container.auditService.log({
      actorUserId: adminUserId,
      actionType: AUDIT_ACTIONS.BILLING_SEAT_RECLAIMED,
      resourceType: 'seat_allocation',
      resourceId: seatId,
      subjectUserId: subjectUserId || undefined,
      metadata: { organizationId: id }
    });

    return reply.status(204).send();
  });
}
