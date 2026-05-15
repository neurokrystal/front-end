import { FastifyInstance } from 'fastify';
import { requirePlatformAdmin } from '@/infrastructure/auth/auth-middleware';
import { sql, and, eq } from 'drizzle-orm';
import { teams as teamsTable, teamMemberships, teamMemberRoleEnum } from './team.schema';
import { z } from 'zod';
import { shareGrants, shareGrantStatusEnum } from '@/domains/sharing/share-grant.schema';

export default async function teamAdminRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requirePlatformAdmin);

  // GET /api/v1/admin/teams — list all teams across all orgs with aggregates
  fastify.get('/', async (request, reply) => {
    // Base team list
    const teams = await fastify.container.db
      .select({
        id: teamsTable.id,
        name: teamsTable.name,
        organizationId: teamsTable.organizationId,
        createdAt: teamsTable.createdAt,
      })
      .from(teamsTable)
      .orderBy(teamsTable.createdAt);

    if (teams.length === 0) return [];

    // Enrich with org names and member/sharing counts via SQL for performance
    const teamIds = teams.map(t => t.id);
    const teamList = await fastify.container.db.execute(sql`
      WITH t AS (
        SELECT id, name, organization_id, created_at FROM teams WHERE id = ANY(${teamIds}::uuid[])
      )
      SELECT 
        t.id,
        t.name,
        t.organization_id AS "organizationId",
        o.name AS org_name,
        t.created_at AS "createdAt",
        (
          SELECT u.name FROM team_memberships tm 
          JOIN "user" u ON u.id = tm.user_id
          WHERE tm.team_id = t.id AND tm.role = 'leader' 
          ORDER BY tm.created_at ASC 
          LIMIT 1
        ) AS leader_name,
        -- member count
        (SELECT COUNT(*)::int FROM team_memberships tm WHERE tm.team_id = t.id) AS member_count,
        -- sharing count: distinct team members who have active team-target share grants to this team
        (
          SELECT COUNT(DISTINCT sg.subject_user_id)::int
          FROM share_grants sg
          JOIN team_memberships tm ON tm.user_id = sg.subject_user_id AND tm.team_id = t.id
          WHERE sg.target_type = 'team'
            AND sg.target_team_id = t.id
            AND sg.status = 'active'
            AND (sg.expires_at IS NULL OR sg.expires_at > now())
        ) AS sharing_count
      FROM t
      JOIN organization o ON o.id = t.organization_id
      ORDER BY t.created_at
    `);

    // Merge back into base list
    const byId = new Map<string, any>(teamList.rows.map((r: any) => [r.id, r]));
    return teams.map((t) => {
      const extra = byId.get(t.id) || {};
      return {
        ...t,
        organizationName: extra.org_name ?? null,
        leaderName: extra.leader_name ?? null,
        memberCount: extra.member_count ?? 0,
        sharingCount: extra.sharing_count ?? 0,
      };
    });
  });

  // GET /api/v1/admin/teams/:id — team details with members and sharing status
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const teamRows = await fastify.container.db.execute(sql`
      SELECT 
        t.id,
        t.name,
        t.organization_id AS "organizationId",
        o.name AS org_name,
        t.created_at AS "createdAt"
      FROM teams t
      JOIN organization o ON o.id = t.organization_id
      WHERE t.id = ${id}
    `);
    const team = teamRows.rows[0];
    if (!team) return reply.status(404).send({ code: 'NOT_FOUND' });

    const members = await fastify.container.db.execute(sql`
      SELECT 
        tm.user_id AS "userId",
        tm.role,
        tm.created_at AS "joinedAt",
        u.name,
        u.email,
        -- sharing flag: does this member have an active team-target grant to this team?
        EXISTS (
          SELECT 1 FROM share_grants sg
          WHERE sg.subject_user_id = tm.user_id
            AND sg.target_type = 'team'
            AND sg.target_team_id = ${id}
            AND sg.status = 'active'
            AND (sg.expires_at IS NULL OR sg.expires_at > now())
        ) AS "hasSharingGrant"
      FROM team_memberships tm
      JOIN "user" u ON u.id = tm.user_id
      WHERE tm.team_id = ${id}
      ORDER BY tm.created_at DESC
    `);

    // Aggregate counts
    const memberCount = members.rows.length;
    const sharingCount = members.rows.filter((m: any) => m.hasSharingGrant).length;

    return {
      ...team,
      organizationName: team.org_name,
      members: members.rows,
      aggregates: {
        memberCount,
        sharingCount,
        // Placeholder for anonymised stats; API returns null if not available
        stats: null as unknown as Record<string, number> | null,
      }
    };
  });

  // POST /api/v1/admin/teams — create a new team
  fastify.post('/', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1),
      organizationId: z.string().min(1),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      fastify.log.warn({ validationError: (parsed.error as any).flatten?.() ?? parsed.error }, 'Request validation failed');
      return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid request data. Check your input and try again.' });
    }
    const { name, organizationId } = parsed.data;

    // Validate organization exists
    const org = await fastify.container.db.execute(sql`SELECT id FROM organization WHERE id = ${organizationId} LIMIT 1`);
    if (!org.rows[0]) return reply.status(404).send({ code: 'ORG_NOT_FOUND' });

    const res = await fastify.container.db.execute(sql`
      INSERT INTO teams (name, organization_id, created_at, updated_at)
      VALUES (${name}, ${organizationId}, now(), now())
      RETURNING id, name, organization_id AS "organizationId", created_at AS "createdAt"
    `);
    return reply.status(201).send(res.rows[0]);
  });

  // POST /api/v1/admin/teams/:id/members — add a member to a team
  fastify.post('/:id/members', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      userId: z.string().min(1),
      role: z.enum(['leader', 'member']).default('member'),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      fastify.log.warn({ validationError: (parsed.error as any).flatten?.() ?? parsed.error }, 'Request validation failed');
      return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid request data. Check your input and try again.' });
    }
    const { userId, role } = parsed.data;

    // Validate team and user
    const team = await fastify.container.db.execute(sql`SELECT id FROM teams WHERE id = ${id} LIMIT 1`);
    if (!team.rows[0]) return reply.status(404).send({ code: 'TEAM_NOT_FOUND' });
    const user = await fastify.container.db.execute(sql`SELECT id FROM "user" WHERE id = ${userId} LIMIT 1`);
    if (!user.rows[0]) return reply.status(404).send({ code: 'USER_NOT_FOUND' });

    // Check if already a member
    const existing = await fastify.container.db.execute(sql`
      SELECT id FROM team_memberships WHERE team_id = ${id} AND user_id = ${userId} LIMIT 1
    `);
    if (existing.rows[0]) return reply.status(409).send({ code: 'ALREADY_MEMBER' });

    await fastify.container.db.execute(sql`
      INSERT INTO team_memberships (team_id, user_id, role, created_at)
      VALUES (${id}, ${userId}, ${role}, now())
    `);
    return reply.status(201).send({ ok: true });
  });

  // DELETE /api/v1/admin/teams/:id/members/:userId — remove a member from a team
  fastify.delete('/:id/members/:userId', async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };

    // Validate membership exists
    const existing = await fastify.container.db.execute(sql`
      SELECT id FROM team_memberships WHERE team_id = ${id} AND user_id = ${userId} LIMIT 1
    `);
    if (!existing.rows[0]) return reply.status(404).send({ code: 'NOT_A_MEMBER' });

    await fastify.container.db.execute(sql`
      DELETE FROM team_memberships WHERE team_id = ${id} AND user_id = ${userId}
    `);
    return reply.status(204).send();
  });
}
