import { db } from '../connection';
import { reportContentBlocks } from '../../../domains/report/features/cms/cms.schema';

export async function seedCmsContent() {
  console.log('Seeding sample CMS content...');
  
  const blocks = [];
  const reportType = 'base';
  const domains = ['safety', 'challenge', 'play'] as const;
  const dimensions = ['self', 'others', 'past', 'future', 'senses', 'perception'] as const;
  const bands = ['very_low', 'low', 'almost_balanced', 'balanced', 'high_excessive'] as const;
  const sections = ['domain_overview', 'felt_state', 'expressed_state', 'alignment'] as const;

  // Domain blocks
  for (const domain of domains) {
    for (const section of sections) {
      for (const band of bands) {
        blocks.push({
          reportType,
          sectionKey: section,
          domain,
          scoreBand: band,
          contentText: `Sample content for ${domain} ${section} at ${band} level. This is a realistic placeholder text that should span at least two to three sentences to demonstrate layout.`,
        });
      }
    }
  }

  // Dimension blocks
  for (const dimension of dimensions) {
    for (const band of bands) {
      blocks.push({
        reportType,
        sectionKey: 'dimension',
        dimension,
        scoreBand: band,
        contentText: `Detailed analysis for your ${dimension} dimension at the ${band} band. This text provides psychological insight into your responses for this specific area.`,
      });
    }
  }

  await db.insert(reportContentBlocks).values(blocks).onConflictDoNothing();
  console.log('Sample CMS content seeded.');
}
