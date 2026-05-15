import { FastifyInstance } from 'fastify';
import { requirePlatformAdmin } from '@/infrastructure/auth/auth-middleware';
import { z } from 'zod';
import { instruments, instrumentItems, instrumentVersions } from './instrument.schema';
import { desc, eq, sql } from 'drizzle-orm';

export default async function instrumentAdminRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requirePlatformAdmin);

  // POST /api/v1/admin/instruments — create instrument
  fastify.post('/', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      description: z.string().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: parsed.error.message });
    }
    const { name, slug, description } = parsed.data;

    // Ensure slug unique
    const existing = await fastify.container.db
      .select({ id: instruments.id })
      .from(instruments)
      .where(eq(instruments.slug, slug))
      .limit(1);
    if (existing[0]) {
      return reply.status(409).send({ code: 'SLUG_TAKEN' });
    }

    const [created] = await fastify.container.db
      .insert(instruments)
      .values({ name, slug, description: description ?? null })
      .returning();

    return reply.status(201).send(created);
  });

  // POST /api/v1/admin/instruments/:id/versions — create new version with incremented version number
  fastify.post('/:id/versions', async (request, reply) => {
    const { id } = request.params as { id: string };

    // Ensure instrument exists
    const instr = await fastify.container.db
      .select({ id: instruments.id })
      .from(instruments)
      .where(eq(instruments.id, id))
      .limit(1);
    if (!instr[0]) return reply.status(404).send({ code: 'NOT_FOUND' });

    // Find current max version
    const versions = await fastify.container.db
      .select({ versionNumber: instrumentVersions.versionNumber })
      .from(instrumentVersions)
      .where(eq(instrumentVersions.instrumentId, id))
      .orderBy(desc(instrumentVersions.versionNumber))
      .limit(1);
    const nextVersion = (versions[0]?.versionNumber ?? 0) + 1;

    const [created] = await fastify.container.db
      .insert(instrumentVersions)
      .values({
        instrumentId: id,
        versionNumber: nextVersion,
        itemCount: 0,
        scoringStrategyKey: 'default',
      })
      .returning();

    return reply.status(201).send(created);
  });

  // GET /api/v1/admin/instruments/:id/versions/:vid/items — get items for a version
  fastify.get('/:id/versions/:vid/items', async (request, reply) => {
    const { id, vid } = request.params as { id: string; vid: string };

    // Verify version belongs to instrument
    const ver = await fastify.container.db
      .select({ id: instrumentVersions.id, instrumentId: instrumentVersions.instrumentId })
      .from(instrumentVersions)
      .where(eq(instrumentVersions.id, vid))
      .limit(1);
    if (!ver[0] || ver[0].instrumentId !== id) return reply.status(404).send({ code: 'NOT_FOUND' });

    const items = await fastify.container.db
      .select()
      .from(instrumentItems)
      .where(eq(instrumentItems.instrumentVersionId, vid))
      .orderBy(instrumentItems.ordinal as any);
    return items;
  });

  // POST /api/v1/admin/instruments/:id/versions/:vid/items — add/update items for a version
  fastify.post('/:id/versions/:vid/items', async (request, reply) => {
    const { id, vid } = request.params as { id: string; vid: string };
    const ItemSchema = z.object({
      id: z.string().optional(),
      ordinal: z.number().int().min(1),
      itemText: z.string().min(1),
      locale: z.string().default('en'),
      responseFormat: z.enum(['likert_5', 'likert_7', 'binary', 'free_text']).default('likert_5'),
      domainTag: z.string().optional(),
      dimensionTag: z.string().optional(),
      stateTag: z.string().optional(),
      categoryTag: z.string().optional(),
      scoreGroupTag: z.string().optional(),
      configJson: z.any().optional(),
    });
    const schema = z.object({ items: z.array(ItemSchema) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: parsed.error.message });
    }

    // Verify version belongs to instrument
    const ver = await fastify.container.db
      .select({ id: instrumentVersions.id, instrumentId: instrumentVersions.instrumentId })
      .from(instrumentVersions)
      .where(eq(instrumentVersions.id, vid))
      .limit(1);
    if (!ver[0] || ver[0].instrumentId !== id) return reply.status(404).send({ code: 'NOT_FOUND' });

    // Upsert items (simple approach: replace by ordinal)
    const items = parsed.data.items;
    // Delete any items not present in payload (by ordinal)
    const ordinals = items.map(i => i.ordinal);
    if (ordinals.length > 0) {
      await fastify.container.db.execute(sql`
        DELETE FROM instrument_items 
        WHERE instrument_version_id = ${vid} 
        AND ordinal NOT IN (${sql.join(ordinals, sql`, `)})
      `);
    } else {
      await fastify.container.db.execute(sql`
        DELETE FROM instrument_items 
        WHERE instrument_version_id = ${vid}
      `);
    }

    // Upsert each item
    for (const it of items) {
      const idToUse = it.id ?? (globalThis as any).crypto?.randomUUID?.() ?? require('crypto').randomUUID();
      await fastify.container.db.execute(sql`
        INSERT INTO instrument_items (id, instrument_version_id, ordinal, item_text, locale, response_format, domain_tag, dimension_tag, state_tag, category_tag, score_group_tag, config_json, created_at)
        VALUES (
          ${idToUse}, ${vid}, ${it.ordinal}, ${it.itemText}, ${it.locale ?? 'en'}, ${it.responseFormat ?? 'likert_5'},
          ${it.domainTag ?? null}, ${it.dimensionTag ?? null}, ${it.stateTag ?? null}, ${it.categoryTag ?? null}, ${it.scoreGroupTag ?? null}, ${it.configJson ?? null}, now()
        )
        ON CONFLICT (id) DO UPDATE SET
          ordinal = EXCLUDED.ordinal,
          item_text = EXCLUDED.item_text,
          locale = EXCLUDED.locale,
          response_format = EXCLUDED.response_format,
          domain_tag = EXCLUDED.domain_tag,
          dimension_tag = EXCLUDED.dimension_tag,
          state_tag = EXCLUDED.state_tag,
          category_tag = EXCLUDED.category_tag,
          score_group_tag = EXCLUDED.score_group_tag,
          config_json = EXCLUDED.config_json
      `);
    }

    // Update itemCount
    await fastify.container.db
      .update(instrumentVersions)
      .set({ itemCount: items.length })
      .where(eq(instrumentVersions.id, vid));

    return { ok: true, count: items.length };
  });
}
