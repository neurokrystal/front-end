import { db } from '@/infrastructure/database/connection';
import { instruments, instrumentVersions, instrumentItems } from '@/domains/instrument/instrument.schema';
import { eq } from 'drizzle-orm';

async function main() {
  const slug = 'base-diagnostic';
  const name = 'Base Diagnostic (sample)';

  const existing = await db.select().from(instruments).where(eq(instruments.slug, slug)).limit(1);
  let instrumentId: string;

  if (existing.length === 0) {
    const ins = await db.insert(instruments).values({
      id: crypto.randomUUID(),
      slug,
      name,
      description: 'Sample instrument for development',
      status: 'active',
    }).returning();
    instrumentId = ins[0].id;
  } else {
    instrumentId = existing[0].id;
  }

  const items = [
    { ordinal: 1, itemText: 'I feel steady and grounded most days', responseFormat: 'likert_5', domainTag: 'safety', dimensionTag: 'self', stateTag: 'felt' },
    { ordinal: 2, itemText: 'I enjoy tackling new challenges', responseFormat: 'likert_5', domainTag: 'challenge', dimensionTag: 'future', stateTag: 'felt' },
    { ordinal: 3, itemText: 'I make time for play and creativity', responseFormat: 'likert_5', domainTag: 'play', dimensionTag: 'senses', stateTag: 'expressed' },
  ] as const;

  const ver = await db.insert(instrumentVersions).values({
    id: crypto.randomUUID(),
    instrumentId,
    versionNumber: 1,
    itemCount: items.length,
    scoringStrategyKey: 'base-diagnostic-v1',
    configJson: {},
    publishedAt: new Date(),
  }).returning();

  const versionId = ver[0].id;

  for (const it of items) {
    await db.insert(instrumentItems).values({
      id: crypto.randomUUID(),
      instrumentVersionId: versionId,
      ordinal: it.ordinal,
      itemText: it.itemText,
      responseFormat: it.responseFormat as any,
      domainTag: it.domainTag,
      dimensionTag: it.dimensionTag,
      stateTag: it.stateTag,
      configJson: {},
    });
  }

  console.log(`[seed:instrument] Seeded instrument ${slug} with ${items.length} items (version ${1}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
