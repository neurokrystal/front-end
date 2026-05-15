import { FastifyInstance } from 'fastify';
import { requirePlatformAdmin } from '@/infrastructure/auth/auth-middleware';
import { sql } from 'drizzle-orm';
import { certificationRecords } from './certification.schema';
import { coachingFirms, coachingFirmMemberships } from './coaching-firm.schema';
import { z } from 'zod';

export default async function coachingAdminRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requirePlatformAdmin);

  // GET /api/v1/admin/coaches — list all coaches with certification status
  fastify.get('/', async (request, reply) => {
    const rows = await fastify.container.db.execute(sql`
      WITH cert AS (
        SELECT 
          cr.coach_user_id,
          cr.status,
          cr.certified_at,
          cr.expires_at
        FROM certification_records cr
      ),
      firm AS (
        SELECT cfm.user_id, cf.name AS firm_name
        FROM coaching_firm_memberships cfm
        JOIN coaching_firms cf ON cf.id = cfm.firm_id
      ),
      client_counts AS (
        SELECT coach_user_id, COUNT(*) FILTER(WHERE status = 'active')::int AS active_clients
        FROM coach_client_links
        GROUP BY coach_user_id
      )
      SELECT 
        u.id AS user_id,
        u.name,
        u.email,
        f.firm_name,
        c.status,
        c.certified_at AS "certifiedAt",
        c.expires_at AS "expiresAt",
        COALESCE(cc.active_clients, 0) AS clients
      FROM "user" u
      LEFT JOIN cert c ON c.coach_user_id = u.id
      LEFT JOIN firm f ON f.user_id = u.id
      LEFT JOIN client_counts cc ON cc.coach_user_id = u.id
      WHERE c.coach_user_id IS NOT NULL
      ORDER BY u.name NULLS LAST
    `);
    return rows.rows;
  });

  // POST /api/v1/admin/coaches — register a new coach (create certification + optional firm membership)
  fastify.post('/', async (request, reply) => {
    const schema = z.object({
      userId: z.string().min(1),
      firmId: z.string().min(1).optional(),
      expiresAt: z.string().datetime().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: parsed.error.message });
    }
    const { userId, firmId, expiresAt } = parsed.data;

    // Ensure user exists and not already certified
    const existing = await fastify.container.db.execute(sql`
      SELECT u.id AS user_id, EXISTS(
        SELECT 1 FROM certification_records cr WHERE cr.coach_user_id = u.id
      ) AS already_certified
      FROM "user" u
      WHERE u.id = ${userId}
      LIMIT 1
    `);
    const userRow = existing.rows[0] as any;
    if (!userRow) return reply.status(404).send({ code: 'NOT_FOUND', message: 'User not found' });
    if (userRow.already_certified === true) {
      return reply.status(409).send({ code: 'ALREADY_CERTIFIED' });
    }

    if (firmId) {
      const firm = await fastify.container.db.execute(sql`SELECT id FROM coaching_firms WHERE id = ${firmId} LIMIT 1`);
      if (!firm.rows[0]) return reply.status(404).send({ code: 'FIRM_NOT_FOUND' });
    }

    // Insert certification record
    const certRes = await fastify.container.db.execute(sql`
      INSERT INTO certification_records (coach_user_id, programme_name, status, certified_at, expires_at)
      VALUES (${userId}, ${'Coach Certification'}, ${'active'}, now(), ${expiresAt ?? null})
      RETURNING id
    `);
    const certId = (certRes.rows[0] as any).id as string;

    // Optional firm membership
    if (firmId) {
      await fastify.container.db.execute(sql`
        INSERT INTO coaching_firm_memberships (firm_id, user_id, role, joined_at)
        VALUES (${firmId}, ${userId}, ${'coach'}, now())
      `);
    }

    return reply.status(201).send({ id: certId, coachUserId: userId, firmId: firmId ?? null, status: 'active', expiresAt: expiresAt ?? null });
  });

  // GET /api/v1/admin/coaches/:userId — single coach detail
  fastify.get('/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };

    const details = await fastify.container.db.execute(sql`
      SELECT 
        u.id AS user_id,
        u.name,
        u.email,
        cr.id AS certification_id,
        cr.status,
        cr.programme_name AS "programmeName",
        cr.certified_at AS "certifiedAt",
        cr.expires_at AS "expiresAt",
        cr.suspended_at AS "suspendedAt",
        cr.revoked_at AS "revokedAt",
        cf.name AS firm_name
      FROM "user" u
      LEFT JOIN certification_records cr ON cr.coach_user_id = u.id
      LEFT JOIN coaching_firm_memberships cfm ON cfm.user_id = u.id
      LEFT JOIN coaching_firms cf ON cf.id = cfm.firm_id
      WHERE u.id = ${userId}
    `);
    const coach = details.rows[0];
    if (!coach) return reply.status(404).send({ code: 'NOT_FOUND' });

    const clients = await fastify.container.db.execute(sql`
      SELECT 
        ccl.id,
        ccl.client_user_id AS "clientUserId",
        ccl.client_email AS "clientEmail",
        ccl.status,
        u.name,
        u.email
      FROM coach_client_links ccl
      LEFT JOIN "user" u ON u.id = ccl.client_user_id
      WHERE ccl.coach_user_id = ${userId}
      ORDER BY ccl.created_at DESC
    `);

    return { ...coach, clients: clients.rows };
  });

  // GET /api/v1/admin/coaches/coaching-firms — list all coaching firms
  fastify.get('/coaching-firms', async (request, reply) => {
    const firms = await fastify.container.db.execute(sql`
      WITH coach_counts AS (
        SELECT firm_id, COUNT(*)::int AS coaches
        FROM coaching_firm_memberships
        GROUP BY firm_id
      ), active_client_counts AS (
        SELECT cfm.firm_id, COUNT(*) FILTER(WHERE ccl.status = 'active')::int AS active_clients
        FROM coaching_firm_memberships cfm
        JOIN coach_client_links ccl ON ccl.coach_user_id = cfm.user_id
        GROUP BY cfm.firm_id
      )
      SELECT 
        cf.id,
        cf.name,
        cf.created_at AS "createdAt",
        COALESCE(cc.coaches, 0) AS coaches,
        COALESCE(acc.active_clients, 0) AS active_clients
      FROM coaching_firms cf
      LEFT JOIN coach_counts cc ON cc.firm_id = cf.id
      LEFT JOIN active_client_counts acc ON acc.firm_id = cf.id
      ORDER BY cf.created_at DESC
    `);
    return firms.rows;
  });

  // PUT /api/v1/admin/coaches/:userId/certification — update certification status
  fastify.put('/:userId/certification', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const body = request.body as Partial<{
      status: 'active' | 'lapsed' | 'suspended' | 'revoked';
      expiresAt: string | null;
    }>;

    const existing = await fastify.container.db.execute(sql`
      SELECT id FROM certification_records WHERE coach_user_id = ${userId} LIMIT 1
    `);
    const rec = existing.rows[0];
    if (!rec) return reply.status(404).send({ code: 'NOT_FOUND' });

    const fields: string[] = [];
    if (body.status) fields.push(sql`status = ${body.status}` as any);
    if (body.expiresAt !== undefined) fields.push(sql`expires_at = ${body.expiresAt}` as any);

    if (fields.length === 0) return reply.status(400).send({ code: 'NO_CHANGES' });

    // Build dynamic SQL update safely with parameterization
    await fastify.container.db.execute(sql`
      UPDATE certification_records
      SET 
        ${sql.join(fields, sql`, `)},
        updated_at = now()
      WHERE id = ${rec.id}
    `);
    return reply.status(204).send();
  });

  // POST /api/v1/admin/coaches/coaching-firms — create a new coaching firm
  fastify.post('/coaching-firms', async (request, reply) => {
    const schema = z.object({ name: z.string().min(1) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: parsed.error.message });
    }
    const { name } = parsed.data;

    // The creating admin becomes the firm admin owner by default
    const adminUserId = request.session!.user.id;

    // Create firm
    const res = await fastify.container.db.execute(sql`
      INSERT INTO coaching_firms (name, firm_admin_user_id, created_at, updated_at)
      VALUES (${name}, ${adminUserId}, now(), now())
      RETURNING id, name, created_at AS "createdAt"
    `);
    const firm = res.rows[0];
    return reply.status(201).send(firm);
  });
}
