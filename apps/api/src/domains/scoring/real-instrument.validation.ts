import { db } from '@/infrastructure/database/connection';
import { instruments, instrumentVersions, instrumentItems } from '@/domains/instrument/instrument.schema';
import { eq, desc } from 'drizzle-orm';
import { ConfigDrivenScoringStrategy } from './strategies/config-driven-scoring.strategy';

async function main() {
  console.log('--- Validating Real Instrument Scoring ---');

  // 1. Get the latest instrument version
  const [instrument] = await db.select().from(instruments).where(eq(instruments.slug, 'base-diagnostic')).limit(1);
  if (!instrument) throw new Error('Instrument not found');

  const [version] = await db.select()
    .from(instrumentVersions)
    .where(eq(instrumentVersions.instrumentId, instrument.id))
    .orderBy(desc(instrumentVersions.versionNumber))
    .limit(1);
  if (!version) throw new Error('Version not found');

  const items = await db.select().from(instrumentItems).where(eq(instrumentItems.instrumentVersionId, version.id));
  if (items.length !== 66) throw new Error(`Expected 66 items, found ${items.length}`);

  const strategy = new ConfigDrivenScoringStrategy(version.configJson as any);

  // Test 1: All 3s
  console.log('Running Test 1: All responses = 3');
  const responses3 = items.map(item => ({
    itemId: item.id,
    responseValue: 3,
    domainTag: item.domainTag,
    dimensionTag: item.dimensionTag,
    categoryTag: item.categoryTag,
    scoreGroupTag: item.scoreGroupTag,
    configJson: item.configJson,
  }));

  const result3 = strategy.score({ 
    instrumentVersionId: version.id,
    runId: 'test-run',
    userId: 'test-user',
    responses: responses3 as any 
  });

  // Verification
  const safetyFeelings = result3.scoreGroups?.find(g => g.key === 'safety_feelings');
  console.log(`Safety Feelings Raw: ${safetyFeelings?.rawScore} (Expected: 12)`);
  console.log(`Safety Feelings %: ${safetyFeelings?.percentage}% (Expected: 50%)`);

  const safetyOverallPct = result3.computedFields?.find(f => f.key === 'safety_overall_pct');
  console.log(`Safety Overall Domain %: ${safetyOverallPct?.percentage}% (Expected: 50%)`);

  const safetyAlignmentPct = result3.computedFields?.find(f => f.key === 'safety_alignment_pct');
  console.log(`Safety Alignment %: ${safetyAlignmentPct?.percentage}% (Expected: 100%)`);

  const safetySkew = result3.computedFields?.find(f => f.key === 'safety_skew');
  console.log(`Safety Skew: ${safetySkew?.numericValue} (Expected: 0)`);

  const safetySelf = result3.scoreGroups?.find(g => g.key === 'safety_self');
  console.log(`Safety Self Raw: ${safetySelf?.rawScore} (Expected: 18)`);
  console.log(`Safety Self %: ${safetySelf?.percentage}% (Expected: 50%)`);

  const safetyAttunement = result3.computedFields?.find(f => f.key === 'safety_attunement');
  console.log(`Safety Attunement: ${safetyAttunement?.percentage}% (Expected: 100%)`);

  const safetyFullPct = result3.computedFields?.find(f => f.key === 'safety_full_pct');
  console.log(`Safety Full Domain %: ${safetyFullPct?.percentage}% (Expected: 50%)`);

  const safetyDomain = result3.domains.find(d => d.domain === 'safety');
  console.log(`Safety Domain Band: ${safetyDomain?.band} (Expected: low)`);

  // Test 2: Skewed responses
  console.log('\nRunning Test 2: Skewed responses (Feelings=5, Behaviours=1)');
  const responsesSkewed = items.map(item => {
    let val = 3;
    if (item.scoreGroupTag === 'safety_feelings') val = 5;
    if (item.scoreGroupTag === 'safety_behaviours') val = 1;
    
    // Reverse scoring adjustment for the test expectations:
    // Items 1, 2 (Safety Feelings) are not reversed. val=5 -> 5.
    // Items 3, 4 (Safety Feelings) are reversed. val=5 -> (5+1)-5 = 1.
    // Wait, the instruction says "Feeling items: all 5 (raw 20 after reverse scoring adjustments)"
    // If all items are answered with 5, and 2 are reversed: (5+5) + (1+1) = 12.
    // To get raw 20, the responses must be such that AFTER reverse scoring they are all 5.
    // So if item is reversed, response should be 1. If not reversed, response should be 5.
    
    let responseValue = val;
    const isReversed = (item.configJson as any)?.reverseScored === true;
    if (item.scoreGroupTag === 'safety_feelings') {
        responseValue = isReversed ? 1 : 5; // Resulting in raw 5 for each item
    } else if (item.scoreGroupTag === 'safety_behaviours') {
        responseValue = isReversed ? 5 : 1; // Resulting in raw 1 for each item
    }

    return {
      itemId: item.id,
      responseValue,
      domainTag: item.domainTag,
      dimensionTag: item.dimensionTag,
      categoryTag: item.categoryTag,
      scoreGroupTag: item.scoreGroupTag,
      configJson: item.configJson,
    };
  });

  const resultSkewed = strategy.score({ 
    instrumentVersionId: version.id,
    runId: 'test-run',
    userId: 'test-user',
    responses: responsesSkewed as any 
  });
  const skewedAlignmentPct = resultSkewed.computedFields?.find(f => f.key === 'safety_alignment_pct');
  console.log(`Skewed Safety Alignment %: ${skewedAlignmentPct?.percentage}% (Expected: 0%)`);

  const skewedSkew = resultSkewed.computedFields?.find(f => f.key === 'safety_skew');
  console.log(`Skewed Safety Skew: ${skewedSkew?.numericValue} (Expected: 1 - feeling_higher)`);

  console.log('\n--- Validation Finished ---');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
