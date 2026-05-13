import { db } from '@/infrastructure/database/connection';
import { reportContentBlocks } from '@/domains/report/features/cms/cms.schema';
import fs from 'fs';
import path from 'path';

async function main() {
  const file = path.resolve(process.cwd(), 'src/infrastructure/database/seeds/base-report-content.seed.json');
  const raw = fs.readFileSync(file, 'utf8');
  const blocks: Array<any> = JSON.parse(raw);

  for (const b of blocks) {
    await db.insert(reportContentBlocks).values({
      id: crypto.randomUUID(),
      reportType: b.reportType,
      sectionKey: b.sectionKey,
      domain: b.domain,
      dimension: b.dimension,
      scoreBand: b.scoreBand,
      alignmentDirection: b.alignmentDirection,
      alignmentSeverity: b.alignmentSeverity,
      locale: b.locale ?? 'en',
      contentText: b.contentText,
      displayOrder: b.displayOrder ?? 0,
      isActive: b.isActive ?? true,
      metadata: b.metadata ?? {},
    }).onConflictDoNothing();
  }

  console.log(`[seed:cms] Inserted/ensured ${blocks.length} content blocks.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
